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

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

// Ignore settings matching Rust struct
export interface IgnoreSettings {
  respect_gitignore: boolean;
  respect_dockerignore: boolean;
  respect_aiignore: boolean;
  framework_presets: string[];
  custom_patterns: string[];
}

// Recent folder entry
export interface RecentFolder {
  path: string;
  name: string;
  lastOpened: number;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  name: string;
  text: string;
  isDefault?: boolean;
}

// Default prompt templates
const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "none",
    name: "No Template",
    text: "",
    isDefault: true,
  },
  {
    id: "general",
    name: "General Context",
    text: "Please use the following project structure and file contents as context for our conversation.\n\n",
    isDefault: true,
  },
  {
    id: "code-review",
    name: "Code Review",
    text: "Act as a Senior Developer. Review the following code for bugs, security vulnerabilities, and performance bottlenecks.\n\n",
    isDefault: true,
  },
  {
    id: "refactor",
    name: "Refactor",
    text: "Suggest improvements to the following code to make it more readable, modular, and maintainable.\n\n",
    isDefault: true,
  },
  {
    id: "explain",
    name: "Explain Code",
    text: "Please explain what this code does, including its main components and how they interact.\n\n",
    isDefault: true,
  },
  {
    id: "debug",
    name: "Debug Helper",
    text: "I'm experiencing an issue with this code. Please analyze it and help me identify potential bugs or problems.\n\n",
    isDefault: true,
  },
];

// Framework presets configuration
export const FRAMEWORK_PRESETS = [
  { id: "react-vite", name: "React / Vite" },
  { id: "rust-cargo", name: "Rust / Cargo" },
  { id: "python-venv", name: "Python / Venv / uv" },
  { id: "nodejs", name: "Node.js" },
  { id: "nextjs", name: "Next.js" },
  { id: "golang", name: "Go" },
  { id: "flutter", name: "Flutter" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C / C++" },
] as const;

interface AppState {
  // State
  rootPath: string | null;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  isScanning: boolean;
  error: string | null;
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  generatedOutput: string;
  originalOutput: string; // Store unfiltered output for reverting
  tokenCount: number;
  isGenerating: boolean;
  recentFolders: RecentFolder[];
  fileTokenMap: Map<string, number>; // Map of file path to token count
  
  // Prompt Templates
  promptTemplates: PromptTemplate[];
  selectedTemplateId: string;
  
  // UI State
  sidebarCollapsed: boolean;
  previewFile: { path: string; name: string; content: string } | null;
  isPrivacyFilterEnabled: boolean;
  isSettingsOpen: boolean;
  
  // Context Window Settings
  targetContextWindow: number;
  customIgnorePatterns: string;
  
  // New Settings
  restoreSessionOnStartup: boolean;
  maxFileSizeKb: number;
  
  // Ignore Settings
  respectGitignore: boolean;
  respectDockerignore: boolean;
  respectAiignore: boolean;
  frameworkPresets: string[];

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  togglePath: (path: string, node: FileNode) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearFileTree: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  generateContext: () => Promise<void>;
  setGeneratedOutput: (output: string) => void;
  toggleSidebar: () => void;
  openFilePreview: (path: string, name: string) => Promise<void>;
  closeFilePreview: () => void;
  togglePrivacyFilter: () => void;
  setPrivacyFilterEnabled: (enabled: boolean) => void;
  loadRecentFolders: () => void;
  openRecentFolder: (path: string) => Promise<void>;
  removeRecentFolder: (path: string) => void;
  clearAllRecentFolders: () => void;
  getFileTokenPercentage: (path: string) => number;
  getFolderTokenPercentage: (node: FileNode) => number;
  setSelectedTemplate: (templateId: string) => void;
  getOutputWithTemplate: () => string;
  openSettings: () => void;
  closeSettings: () => void;
  clearAllStorage: () => void;
  restoreSession: () => Promise<void>;
  setTargetContextWindow: (tokens: number) => void;
  setCustomIgnorePatterns: (patterns: string) => void;
  getContextPercentage: () => number;
  getContextStatus: () => 'green' | 'yellow' | 'red';
  
  // New Settings Actions
  setRestoreSessionOnStartup: (enabled: boolean) => void;
  setMaxFileSizeKb: (size: number) => void;
  setRespectGitignore: (enabled: boolean) => void;
  setRespectDockerignore: (enabled: boolean) => void;
  setRespectAiignore: (enabled: boolean) => void;
  setFrameworkPresets: (presets: string[]) => void;
  toggleFrameworkPreset: (preset: string) => void;
  getIgnoreSettings: () => IgnoreSettings;
  
  // Prompt Template CRUD
  addTemplate: (name: string, text: string) => void;
  updateTemplate: (id: string, name: string, text: string) => void;
  deleteTemplate: (id: string) => void;
  resetTemplatesToDefault: () => void;
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

// Resolve theme to actual dark/light
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

// Get initial theme from localStorage (now supports 'system')
function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved && ["dark", "light", "system"].includes(saved)) return saved;
  return "system"; // Default to system theme
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

// Load selected template from localStorage
function loadSelectedTemplateFromStorage(): string {
  return localStorage.getItem("selectedTemplate") || "none";
}

// Save selected template to localStorage
function saveSelectedTemplate(templateId: string) {
  localStorage.setItem("selectedTemplate", templateId);
}

// Load target context window from localStorage
function loadTargetContextWindow(): number {
  const saved = localStorage.getItem("targetContextWindow");
  return saved ? parseInt(saved, 10) : 128000;
}

// Save target context window to localStorage
function saveTargetContextWindow(tokens: number) {
  localStorage.setItem("targetContextWindow", tokens.toString());
}

// Load custom ignore patterns from localStorage
function loadCustomIgnorePatterns(): string {
  return localStorage.getItem("customIgnorePatterns") || "";
}

// Save custom ignore patterns to localStorage
function saveCustomIgnorePatterns(patterns: string) {
  localStorage.setItem("customIgnorePatterns", patterns);
}

// Load restore session on startup setting
function loadRestoreSessionOnStartup(): boolean {
  return localStorage.getItem("restoreSessionOnStartup") !== "false"; // Default true
}

function saveRestoreSessionOnStartup(enabled: boolean) {
  localStorage.setItem("restoreSessionOnStartup", enabled.toString());
}

// Load max file size in KB
function loadMaxFileSizeKb(): number {
  const saved = localStorage.getItem("maxFileSizeKb");
  return saved ? parseInt(saved, 10) : 1024; // Default 1MB
}

function saveMaxFileSizeKb(size: number) {
  localStorage.setItem("maxFileSizeKb", size.toString());
}

// Load ignore settings
function loadRespectGitignore(): boolean {
  return localStorage.getItem("respectGitignore") !== "false"; // Default true
}

function saveRespectGitignore(enabled: boolean) {
  localStorage.setItem("respectGitignore", enabled.toString());
}

function loadRespectDockerignore(): boolean {
  return localStorage.getItem("respectDockerignore") === "true"; // Default false
}

function saveRespectDockerignore(enabled: boolean) {
  localStorage.setItem("respectDockerignore", enabled.toString());
}

function loadRespectAiignore(): boolean {
  return localStorage.getItem("respectAiignore") !== "false"; // Default true
}

function saveRespectAiignore(enabled: boolean) {
  localStorage.setItem("respectAiignore", enabled.toString());
}

function loadFrameworkPresets(): string[] {
  try {
    const saved = localStorage.getItem("frameworkPresets");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveFrameworkPresets(presets: string[]) {
  localStorage.setItem("frameworkPresets", JSON.stringify(presets));
}

// Load custom prompt templates
function loadCustomTemplates(): PromptTemplate[] {
  try {
    const saved = localStorage.getItem("customTemplates");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveCustomTemplates(templates: PromptTemplate[]) {
  localStorage.setItem("customTemplates", JSON.stringify(templates));
}

// Get all templates (default + custom)
function getAllTemplates(): PromptTemplate[] {
  const customTemplates = loadCustomTemplates();
  return [...DEFAULT_TEMPLATES, ...customTemplates];
}

// Session state interface
interface SessionState {
  rootPath: string;
  selectedPaths: string[];
}

// Load session state from localStorage
function loadSessionState(): SessionState | null {
  try {
    const saved = localStorage.getItem("sessionState");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save session state to localStorage
function saveSessionState(rootPath: string, selectedPaths: string[]) {
  localStorage.setItem("sessionState", JSON.stringify({ rootPath, selectedPaths }));
}

// Clear session state from localStorage
function clearSessionState() {
  localStorage.removeItem("sessionState");
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

const initialTheme = getInitialTheme();

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  rootPath: null,
  fileTree: null,
  selectedPaths: new Set(),
  isScanning: false,
  error: null,
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  generatedOutput: "",
  originalOutput: "", // Store original unfiltered output
  tokenCount: 0,
  isGenerating: false,
  recentFolders: loadRecentFoldersFromStorage(),
  fileTokenMap: new Map(),
  
  // Prompt Templates
  promptTemplates: getAllTemplates(),
  selectedTemplateId: loadSelectedTemplateFromStorage(),
  
  // UI State
  sidebarCollapsed: true,
  previewFile: null,
  isPrivacyFilterEnabled: true, // Default to true for safety
  isSettingsOpen: false,
  
  // Context Window Settings
  targetContextWindow: loadTargetContextWindow(),
  customIgnorePatterns: loadCustomIgnorePatterns(),
  
  // New Settings
  restoreSessionOnStartup: loadRestoreSessionOnStartup(),
  maxFileSizeKb: loadMaxFileSizeKb(),
  
  // Ignore Settings
  respectGitignore: loadRespectGitignore(),
  respectDockerignore: loadRespectDockerignore(),
  respectAiignore: loadRespectAiignore(),
  frameworkPresets: loadFrameworkPresets(),

  // Actions
  scanDirectory: async (path: string) => {
    set({ isScanning: true, error: null });
    try {
      const { getIgnoreSettings } = get();
      const ignoreSettings = getIgnoreSettings();
      
      const tree = await invoke<FileNode>("get_file_tree", { 
        basePath: path,
        customIgnorePatterns: null, // Now handled via ignoreSettings
        ignoreSettings,
      });
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
      
      // Save session state
      saveSessionState(path, []);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isScanning: false,
      });
    }
  },

  togglePath: (path: string, node: FileNode) => {
    const { selectedPaths, generateContext, rootPath } = get();
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
    
    // Save session state
    if (rootPath) {
      saveSessionState(rootPath, Array.from(newSelected));
    }
    
    // Debounce the heavy lifting (file reading, token counting)
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ isGenerating: true }); // Show loading state immediately
    debounceTimer = setTimeout(() => {
      generateContext();
    }, 400);
  },

  selectAll: () => {
    const { fileTree, generateContext, rootPath } = get();
    if (fileTree) {
      const allPaths = getAllPaths(fileTree);
      set({ selectedPaths: new Set(allPaths) });
      
      // Save session state
      if (rootPath) {
        saveSessionState(rootPath, allPaths);
      }
      
      // Debounce the heavy lifting
      if (debounceTimer) clearTimeout(debounceTimer);
      set({ isGenerating: true });
      debounceTimer = setTimeout(() => {
        generateContext();
      }, 400);
    }
  },

  deselectAll: () => {
    const { rootPath } = get();
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
    
    // Save session state (empty selection)
    if (rootPath) {
      saveSessionState(rootPath, []);
    }
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

  setTheme: (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    const resolved = resolveTheme(newTheme);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    set({ theme: newTheme, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const { theme, setTheme } = get();
    // Cycle through: dark -> light -> system -> dark
    const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(nextTheme);
  },

  generateContext: async () => {
    const { fileTree, selectedPaths, rootPath, isPrivacyFilterEnabled, maxFileSizeKb } = get();
    
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

      // Read file contents from Rust backend with max file size
      const contents = await invoke<Record<string, string>>("read_files_contents", {
        filePaths: selectedFilePaths,
        maxFileSizeKb,
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
      const { maxFileSizeKb } = get();
      const contents = await invoke<Record<string, string>>("read_files_contents", {
        filePaths: [path],
        maxFileSizeKb,
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
    const { isPrivacyFilterEnabled, setPrivacyFilterEnabled } = get();
    setPrivacyFilterEnabled(!isPrivacyFilterEnabled);
  },

  setPrivacyFilterEnabled: (enabled: boolean) => {
    const { originalOutput } = get();
    
    if (enabled && originalOutput) {
      // Apply filter: show masked version
      const filteredOutput = applyPrivacyFilter(originalOutput);
      const tokens = countTokens(filteredOutput);
      set({ 
        isPrivacyFilterEnabled: enabled, 
        generatedOutput: filteredOutput,
        tokenCount: tokens 
      });
    } else if (!enabled && originalOutput) {
      // Revert: show original version
      const tokens = countTokens(originalOutput);
      set({ 
        isPrivacyFilterEnabled: enabled, 
        generatedOutput: originalOutput,
        tokenCount: tokens 
      });
    } else {
      // No output, just set the state
      set({ isPrivacyFilterEnabled: enabled });
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

  getFolderTokenPercentage: (node: FileNode) => {
    const { fileTokenMap, tokenCount, selectedPaths } = get();
    if (tokenCount === 0 || !node.is_dir) return 0;
    
    // Get all file paths under this folder that are selected
    const allFilePaths = getAllFilePaths(node);
    const selectedFilePaths = allFilePaths.filter(p => selectedPaths.has(p));
    
    // Sum up tokens for all selected files in this folder
    let folderTokens = 0;
    for (const filePath of selectedFilePaths) {
      folderTokens += fileTokenMap.get(filePath) || 0;
    }
    
    return Math.round((folderTokens / tokenCount) * 100);
  },

  removeRecentFolder: (path: string) => {
    const { recentFolders } = get();
    const updated = recentFolders.filter(f => f.path !== path);
    saveRecentFolders(updated);
    set({ recentFolders: updated });
  },

  clearAllRecentFolders: () => {
    saveRecentFolders([]);
    set({ recentFolders: [] });
  },

  setSelectedTemplate: (templateId: string) => {
    saveSelectedTemplate(templateId);
    set({ selectedTemplateId: templateId });
  },

  getOutputWithTemplate: () => {
    const { generatedOutput, promptTemplates, selectedTemplateId } = get();
    const template = promptTemplates.find(t => t.id === selectedTemplateId);
    if (template && template.text) {
      return template.text + generatedOutput;
    }
    return generatedOutput;
  },

  openSettings: () => {
    set({ isSettingsOpen: true });
  },

  closeSettings: () => {
    set({ isSettingsOpen: false });
  },

  clearAllStorage: () => {
    localStorage.removeItem("recentFolders");
    localStorage.removeItem("sessionState");
    localStorage.removeItem("selectedTemplate");
    // Keep theme preference
    set({
      recentFolders: [],
      selectedTemplateId: "none",
    });
    clearSessionState();
  },

  restoreSession: async () => {
    const session = loadSessionState();
    if (session && session.rootPath) {
      try {
        const { getIgnoreSettings } = get();
        const ignoreSettings = getIgnoreSettings();
        
        const tree = await invoke<FileNode>("get_file_tree", { 
          basePath: session.rootPath,
          customIgnorePatterns: null,
          ignoreSettings,
        });
        
        // Restore selected paths that still exist in the tree
        const allPaths = getAllPaths(tree);
        const validSelectedPaths = session.selectedPaths.filter(p => allPaths.includes(p));
        
        const { recentFolders, generateContext } = get();
        const updatedRecent = addToRecentFolders(session.rootPath, recentFolders);
        
        set({
          rootPath: session.rootPath,
          fileTree: tree,
          selectedPaths: new Set(validSelectedPaths),
          isScanning: false,
          recentFolders: updatedRecent,
          sidebarCollapsed: false,
        });
        
        // Generate context if there were selected paths
        if (validSelectedPaths.length > 0) {
          set({ isGenerating: true });
          setTimeout(() => generateContext(), 100);
        }
      } catch (err) {
        // Session restore failed, clear it
        console.error("Failed to restore session:", err);
        clearSessionState();
      }
    }
  },

  setTargetContextWindow: (tokens: number) => {
    saveTargetContextWindow(tokens);
    set({ targetContextWindow: tokens });
  },

  setCustomIgnorePatterns: (patterns: string) => {
    saveCustomIgnorePatterns(patterns);
    set({ customIgnorePatterns: patterns });
  },

  getContextPercentage: () => {
    const { tokenCount, targetContextWindow } = get();
    if (targetContextWindow === 0) return 0;
    return Math.min(100, Math.round((tokenCount / targetContextWindow) * 100));
  },

  getContextStatus: () => {
    const { tokenCount, targetContextWindow } = get();
    if (targetContextWindow === 0) return 'green';
    const percentage = (tokenCount / targetContextWindow) * 100;
    if (percentage > 85) return 'red';
    if (percentage > 60) return 'yellow';
    return 'green';
  },
  
  // New Settings Actions
  setRestoreSessionOnStartup: (enabled: boolean) => {
    saveRestoreSessionOnStartup(enabled);
    set({ restoreSessionOnStartup: enabled });
  },

  setMaxFileSizeKb: (size: number) => {
    saveMaxFileSizeKb(size);
    set({ maxFileSizeKb: size });
  },

  setRespectGitignore: (enabled: boolean) => {
    saveRespectGitignore(enabled);
    set({ respectGitignore: enabled });
  },

  setRespectDockerignore: (enabled: boolean) => {
    saveRespectDockerignore(enabled);
    set({ respectDockerignore: enabled });
  },

  setRespectAiignore: (enabled: boolean) => {
    saveRespectAiignore(enabled);
    set({ respectAiignore: enabled });
  },

  setFrameworkPresets: (presets: string[]) => {
    saveFrameworkPresets(presets);
    set({ frameworkPresets: presets });
  },

  toggleFrameworkPreset: (preset: string) => {
    const { frameworkPresets } = get();
    const newPresets = frameworkPresets.includes(preset)
      ? frameworkPresets.filter(p => p !== preset)
      : [...frameworkPresets, preset];
    saveFrameworkPresets(newPresets);
    set({ frameworkPresets: newPresets });
  },

  getIgnoreSettings: (): IgnoreSettings => {
    const { respectGitignore, respectDockerignore, respectAiignore, frameworkPresets, customIgnorePatterns } = get();
    // Parse custom patterns (one per line)
    const patterns = customIgnorePatterns
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('#'));
    
    return {
      respect_gitignore: respectGitignore,
      respect_dockerignore: respectDockerignore,
      respect_aiignore: respectAiignore,
      framework_presets: frameworkPresets,
      custom_patterns: patterns,
    };
  },
  
  // Prompt Template CRUD
  addTemplate: (name: string, text: string) => {
    const id = `custom-${Date.now()}`;
    const newTemplate: PromptTemplate = { id, name, text, isDefault: false };
    const customTemplates = loadCustomTemplates();
    const updatedCustom = [...customTemplates, newTemplate];
    saveCustomTemplates(updatedCustom);
    set({ promptTemplates: [...DEFAULT_TEMPLATES, ...updatedCustom] });
  },

  updateTemplate: (id: string, name: string, text: string) => {
    const { promptTemplates } = get();
    const template = promptTemplates.find(t => t.id === id);
    
    if (template?.isDefault) {
      // For default templates, we save an override in custom templates
      const customTemplates = loadCustomTemplates();
      const existingOverride = customTemplates.findIndex(t => t.id === id);
      const updatedTemplate: PromptTemplate = { id, name, text, isDefault: true };
      
      if (existingOverride >= 0) {
        customTemplates[existingOverride] = updatedTemplate;
      } else {
        customTemplates.push(updatedTemplate);
      }
      saveCustomTemplates(customTemplates);
      
      // Merge default templates with overrides
      const mergedTemplates = DEFAULT_TEMPLATES.map(dt => {
        const override = customTemplates.find(ct => ct.id === dt.id);
        return override || dt;
      });
      const nonDefaultCustom = customTemplates.filter(ct => !DEFAULT_TEMPLATES.some(dt => dt.id === ct.id));
      set({ promptTemplates: [...mergedTemplates, ...nonDefaultCustom] });
    } else {
      // For custom templates, update directly
      const customTemplates = loadCustomTemplates();
      const index = customTemplates.findIndex(t => t.id === id);
      if (index >= 0) {
        customTemplates[index] = { id, name, text, isDefault: false };
        saveCustomTemplates(customTemplates);
        set({ promptTemplates: [...DEFAULT_TEMPLATES, ...customTemplates] });
      }
    }
  },

  deleteTemplate: (id: string) => {
    const { promptTemplates, selectedTemplateId, setSelectedTemplate } = get();
    const template = promptTemplates.find(t => t.id === id);
    
    // Can't delete default templates (only reset them)
    if (template?.isDefault) {
      // If it was a modified default, remove the override
      const customTemplates = loadCustomTemplates();
      const filtered = customTemplates.filter(t => t.id !== id);
      saveCustomTemplates(filtered);
      
      const mergedTemplates = DEFAULT_TEMPLATES.map(dt => {
        const override = filtered.find(ct => ct.id === dt.id);
        return override || dt;
      });
      const nonDefaultCustom = filtered.filter(ct => !DEFAULT_TEMPLATES.some(dt => dt.id === ct.id));
      set({ promptTemplates: [...mergedTemplates, ...nonDefaultCustom] });
      return;
    }
    
    // Delete custom template
    const customTemplates = loadCustomTemplates();
    const filtered = customTemplates.filter(t => t.id !== id);
    saveCustomTemplates(filtered);
    set({ promptTemplates: [...DEFAULT_TEMPLATES, ...filtered] });
    
    // If deleted template was selected, switch to "none"
    if (selectedTemplateId === id) {
      setSelectedTemplate("none");
    }
  },

  resetTemplatesToDefault: () => {
    const { selectedTemplateId, setSelectedTemplate } = get();
    
    // Clear all custom templates from storage
    saveCustomTemplates([]);
    
    // Reset to default templates only
    set({ promptTemplates: [...DEFAULT_TEMPLATES] });
    
    // If selected template was a custom one, switch to "none"
    const isDefaultTemplate = DEFAULT_TEMPLATES.some(t => t.id === selectedTemplateId);
    if (!isDefaultTemplate) {
      setSelectedTemplate("none");
    }
  },
}));
