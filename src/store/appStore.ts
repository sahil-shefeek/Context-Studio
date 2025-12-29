import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { get_encoding } from "@dqbd/tiktoken";

// Types matching the Rust FileNode structure
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export type Theme = "dark" | "light";

// Recent folder entry
export interface RecentFolder {
  path: string;
  name: string;
  lastOpened: number;
}

interface AppState {
  // State
  rootPath: string | null;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  isScanning: boolean;
  error: string | null;
  theme: Theme;
  generatedOutput: string;
  originalOutput: string; // Store unfiltered output for reverting
  tokenCount: number;
  isGenerating: boolean;
  recentFolders: RecentFolder[];
  fileTokenMap: Map<string, number>; // Map of file path to token count
  
  // UI State
  sidebarCollapsed: boolean;
  previewFile: { path: string; name: string; content: string } | null;
  isPrivacyFilterEnabled: boolean;

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  togglePath: (path: string, node: FileNode) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearFileTree: () => void;
  toggleTheme: () => void;
  generateContext: () => Promise<void>;
  setGeneratedOutput: (output: string) => void;
  toggleSidebar: () => void;
  openFilePreview: (path: string, name: string) => Promise<void>;
  closeFilePreview: () => void;
  togglePrivacyFilter: () => void;
  loadRecentFolders: () => void;
  openRecentFolder: (path: string) => Promise<void>;
  getFileTokenPercentage: (path: string) => number;
}

// Helper to get all paths from a node (including children)
function getAllPaths(node: FileNode): string[] {
  const paths: string[] = [node.path];
  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllPaths(child));
    }
  }
  return paths;
}

// Helper to get all file paths from a tree (files only, no directories)
function getAllFilePaths(node: FileNode): string[] {
  const paths: string[] = [];
  if (!node.is_dir) {
    paths.push(node.path);
  }
  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllFilePaths(child));
    }
  }
  return paths;
}

// Generate tree structure text similar to the 'tree' command
function generateTreeText(node: FileNode, prefix: string = "", isLast: boolean = true, isRoot: boolean = true): string {
  let result = "";
  
  if (isRoot) {
    result += node.name + "\n";
  } else {
    result += prefix + (isLast ? "└── " : "├── ") + node.name + "\n";
  }

  if (node.children && node.children.length > 0) {
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children!.length - 1;
      result += generateTreeText(child, childPrefix, isLastChild, false);
    });
  }

  return result;
}

// Get language identifier from file extension for syntax highlighting
function getLanguageId(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    toml: "toml",
    ini: "ini",
    env: "shell",
    dockerfile: "dockerfile",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || ext;
}

// Count tokens using tiktoken
function countTokens(text: string): number {
  try {
    const enc = get_encoding("cl100k_base");
    const tokens = enc.encode(text);
    const count = tokens.length;
    enc.free();
    return count;
  } catch {
    // Fallback: rough estimate (1 token ≈ 4 chars)
    return Math.ceil(text.length / 4);
  }
}

// Get initial theme from system preference or localStorage
function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Load recent folders from localStorage
function loadRecentFoldersFromStorage(): RecentFolder[] {
  try {
    const saved = localStorage.getItem("recentFolders");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save recent folders to localStorage
function saveRecentFolders(folders: RecentFolder[]) {
  localStorage.setItem("recentFolders", JSON.stringify(folders.slice(0, 5)));
}

// Add folder to recent list
function addToRecentFolders(path: string, existingFolders: RecentFolder[]): RecentFolder[] {
  const name = path.split('/').pop() || path;
  const newEntry: RecentFolder = { path, name, lastOpened: Date.now() };
  
  // Remove existing entry with same path
  const filtered = existingFolders.filter(f => f.path !== path);
  
  // Add to beginning and limit to 5
  const updated = [newEntry, ...filtered].slice(0, 5);
  saveRecentFolders(updated);
  return updated;
}

// Debounce timer for generateContext
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Debounce timer for token counting (separate from generation)
let tokenCountTimer: ReturnType<typeof setTimeout> | null = null;

// Privacy filter regex patterns
const PRIVACY_PATTERNS = [
  // API Keys (OpenAI, Google, AWS, etc.)
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: "sk-***REDACTED***" },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: "AIza***REDACTED***" },
  { pattern: /AKIA[A-Z0-9]{16}/g, replacement: "AKIA***REDACTED***" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: "ghp_***REDACTED***" },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: "gho_***REDACTED***" },
  { pattern: /glpat-[a-zA-Z0-9_-]{20,}/g, replacement: "glpat-***REDACTED***" },
  // .env values (KEY=value patterns)
  { pattern: /((?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|AUTH|CREDENTIALS|DB_PASS)[A-Z_]*)\s*=\s*["']?([^"'\s\n]+)["']?/gi, replacement: "$1=***REDACTED***" },
  // SSH Private Keys
  { pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g, replacement: "-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----" },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, replacement: "Bearer ***REDACTED***" },
  // Generic long hex strings (potential secrets)
  { pattern: /['"]\b[a-f0-9]{32,}\b['"]/gi, replacement: '"***REDACTED_HEX***"' },
];

function applyPrivacyFilter(text: string): string {
  let filtered = text;
  for (const { pattern, replacement } of PRIVACY_PATTERNS) {
    filtered = filtered.replace(pattern, replacement);
  }
  return filtered;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  rootPath: null,
  fileTree: null,
  selectedPaths: new Set(),
  isScanning: false,
  error: null,
  theme: getInitialTheme(),
  generatedOutput: "",
  originalOutput: "", // Store original unfiltered output
  tokenCount: 0,
  isGenerating: false,
  recentFolders: loadRecentFoldersFromStorage(),
  fileTokenMap: new Map(),
  
  // UI State
  sidebarCollapsed: true,
  previewFile: null,
  isPrivacyFilterEnabled: false,

  // Actions
  scanDirectory: async (path: string) => {
    set({ isScanning: true, error: null });
    try {
      const tree = await invoke<FileNode>("get_file_tree", { basePath: path });
      const { recentFolders } = get();
      const updatedRecent = addToRecentFolders(path, recentFolders);
      
      set({
        rootPath: path,
        fileTree: tree,
        selectedPaths: new Set(),
        isScanning: false,
        generatedOutput: "",
        originalOutput: "",
        tokenCount: 0,
        recentFolders: updatedRecent,
        fileTokenMap: new Map(),
        sidebarCollapsed: false, // Expand sidebar when folder is opened
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isScanning: false,
      });
    }
  },

  togglePath: (path: string, node: FileNode) => {
    const { selectedPaths, generateContext } = get();
    const newSelected = new Set(selectedPaths);
    
    // Get all paths for this node (if directory, includes all children)
    const pathsToToggle = getAllPaths(node);
    
    // Check if this path is currently selected
    const isSelected = newSelected.has(path);
    
    if (isSelected) {
      // Remove all paths
      for (const p of pathsToToggle) {
        newSelected.delete(p);
      }
    } else {
      // Add all paths
      for (const p of pathsToToggle) {
        newSelected.add(p);
      }
    }
    
    // Update selection immediately for snappy UI
    set({ selectedPaths: newSelected });
    
    // Debounce the heavy lifting (file reading, token counting)
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ isGenerating: true }); // Show loading state immediately
    debounceTimer = setTimeout(() => {
      generateContext();
    }, 400);
  },

  selectAll: () => {
    const { fileTree, generateContext } = get();
    if (fileTree) {
      const allPaths = getAllPaths(fileTree);
      set({ selectedPaths: new Set(allPaths) });
      
      // Debounce the heavy lifting
      if (debounceTimer) clearTimeout(debounceTimer);
      set({ isGenerating: true });
      debounceTimer = setTimeout(() => {
        generateContext();
      }, 400);
    }
  },

  deselectAll: () => {
    // Cancel any pending generation
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ 
      selectedPaths: new Set(), 
      generatedOutput: "", 
      originalOutput: "",
      tokenCount: 0, 
      isGenerating: false,
      fileTokenMap: new Map(),
    });
  },

  clearFileTree: () => {
    // Cancel any pending generation
    if (debounceTimer) clearTimeout(debounceTimer);
    set({
      rootPath: null,
      fileTree: null,
      selectedPaths: new Set(),
      error: null,
      generatedOutput: "",
      originalOutput: "",
      tokenCount: 0,
      isGenerating: false,
      fileTokenMap: new Map(),
    });
  },

  toggleTheme: () => {
    const { theme } = get();
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    set({ theme: newTheme });
  },

  generateContext: async () => {
    const { fileTree, selectedPaths, rootPath, isPrivacyFilterEnabled } = get();
    
    if (!fileTree || selectedPaths.size === 0) {
      set({ generatedOutput: "", originalOutput: "", tokenCount: 0, isGenerating: false, fileTokenMap: new Map() });
      return;
    }

    // isGenerating is already set by the debounced caller
    try {
      // Get only file paths (not directories)
      const allFilePaths = getAllFilePaths(fileTree);
      const selectedFilePaths = allFilePaths.filter(p => selectedPaths.has(p));

      if (selectedFilePaths.length === 0) {
        set({ generatedOutput: "", originalOutput: "", tokenCount: 0, isGenerating: false, fileTokenMap: new Map() });
        return;
      }

      // Generate tree structure
      const treeText = generateTreeText(fileTree);

      // Read file contents from Rust backend
      const contents = await invoke<Record<string, string>>("read_files_contents", {
        filePaths: selectedFilePaths,
      });

      // Build the output and track per-file tokens
      let output = "# Project Structure\n\n```\n" + treeText + "```\n\n---\n\n# File Contents\n\n";
      const newFileTokenMap = new Map<string, number>();

      for (const filePath of selectedFilePaths) {
        const content = contents[filePath] || "[Error reading file]";
        const relativePath = rootPath ? filePath.replace(rootPath, "").replace(/^\//, "") : filePath;
        const langId = getLanguageId(filePath);
        
        const fileSection = `## File: ${relativePath}\n\n\`\`\`${langId}\n${content}\n\`\`\`\n\n`;
        output += fileSection;
        
        // Count tokens for this file
        const fileTokens = countTokens(fileSection);
        newFileTokenMap.set(filePath, fileTokens);
      }

      // Count total tokens
      const tokens = countTokens(output);

      // Apply privacy filter if enabled
      const displayOutput = isPrivacyFilterEnabled ? applyPrivacyFilter(output) : output;

      set({ 
        generatedOutput: displayOutput, 
        originalOutput: output, // Always store original
        tokenCount: tokens, 
        isGenerating: false,
        fileTokenMap: newFileTokenMap,
      });
    } catch (err) {
      console.error("Failed to generate context:", err);
      set({ 
        generatedOutput: `Error generating context: ${err}`, 
        originalOutput: "",
        tokenCount: 0, 
        isGenerating: false,
        fileTokenMap: new Map(),
      });
    }
  },

  setGeneratedOutput: (output: string) => {
    const { isPrivacyFilterEnabled, originalOutput } = get();
    
    // When user edits, we update both displayed and original
    // If privacy filter is on, we apply it to display but keep original
    const finalOutput = isPrivacyFilterEnabled ? applyPrivacyFilter(output) : output;
    
    // Update output immediately for responsive typing
    set({ 
      generatedOutput: finalOutput,
      // Only update original if filter is off (user is editing raw content)
      originalOutput: isPrivacyFilterEnabled ? originalOutput : output,
    });
    
    // Debounce token counting for performance (500ms delay)
    if (tokenCountTimer) clearTimeout(tokenCountTimer);
    tokenCountTimer = setTimeout(() => {
      const tokens = countTokens(finalOutput);
      set({ tokenCount: tokens });
    }, 500);
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  openFilePreview: async (path: string, name: string) => {
    try {
      const contents = await invoke<Record<string, string>>("read_files_contents", {
        filePaths: [path],
      });
      const content = contents[path] || "[Error reading file]";
      set({ previewFile: { path, name, content } });
    } catch (err) {
      console.error("Failed to read file for preview:", err);
    }
  },

  closeFilePreview: () => {
    set({ previewFile: null });
  },

  togglePrivacyFilter: () => {
    const { isPrivacyFilterEnabled, originalOutput } = get();
    const newEnabled = !isPrivacyFilterEnabled;
    
    if (newEnabled && originalOutput) {
      // Apply filter: show masked version
      const filteredOutput = applyPrivacyFilter(originalOutput);
      const tokens = countTokens(filteredOutput);
      set({ 
        isPrivacyFilterEnabled: newEnabled, 
        generatedOutput: filteredOutput,
        tokenCount: tokens 
      });
    } else if (!newEnabled && originalOutput) {
      // Revert: show original version
      const tokens = countTokens(originalOutput);
      set({ 
        isPrivacyFilterEnabled: newEnabled, 
        generatedOutput: originalOutput,
        tokenCount: tokens 
      });
    } else {
      // No output, just toggle the state
      set({ isPrivacyFilterEnabled: newEnabled });
    }
  },

  loadRecentFolders: () => {
    const folders = loadRecentFoldersFromStorage();
    set({ recentFolders: folders });
  },

  openRecentFolder: async (path: string) => {
    const { scanDirectory } = get();
    await scanDirectory(path);
  },

  getFileTokenPercentage: (path: string) => {
    const { fileTokenMap, tokenCount } = get();
    if (tokenCount === 0) return 0;
    const fileTokens = fileTokenMap.get(path) || 0;
    return Math.round((fileTokens / tokenCount) * 100);
  },
}));
