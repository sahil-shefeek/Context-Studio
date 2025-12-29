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

interface AppState {
  // State
  rootPath: string | null;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  isScanning: boolean;
  error: string | null;
  theme: Theme;
  generatedOutput: string;
  tokenCount: number;
  isGenerating: boolean;

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  togglePath: (path: string, node: FileNode) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearFileTree: () => void;
  toggleTheme: () => void;
  generateContext: () => Promise<void>;
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

// Debounce timer for generateContext
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  rootPath: null,
  fileTree: null,
  selectedPaths: new Set(),
  isScanning: false,
  error: null,
  theme: getInitialTheme(),
  generatedOutput: "",
  tokenCount: 0,
  isGenerating: false,

  // Actions
  scanDirectory: async (path: string) => {
    set({ isScanning: true, error: null });
    try {
      const tree = await invoke<FileNode>("get_file_tree", { basePath: path });
      set({
        rootPath: path,
        fileTree: tree,
        selectedPaths: new Set(),
        isScanning: false,
        generatedOutput: "",
        tokenCount: 0,
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
    set({ selectedPaths: new Set(), generatedOutput: "", tokenCount: 0, isGenerating: false });
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
      tokenCount: 0,
      isGenerating: false,
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
    const { fileTree, selectedPaths, rootPath } = get();
    
    if (!fileTree || selectedPaths.size === 0) {
      set({ generatedOutput: "", tokenCount: 0, isGenerating: false });
      return;
    }

    // isGenerating is already set by the debounced caller
    try {
      // Get only file paths (not directories)
      const allFilePaths = getAllFilePaths(fileTree);
      const selectedFilePaths = allFilePaths.filter(p => selectedPaths.has(p));

      if (selectedFilePaths.length === 0) {
        set({ generatedOutput: "", tokenCount: 0, isGenerating: false });
        return;
      }

      // Generate tree structure
      const treeText = generateTreeText(fileTree);

      // Read file contents from Rust backend
      const contents = await invoke<Record<string, string>>("read_files_contents", {
        filePaths: selectedFilePaths,
      });

      // Build the output
      let output = "# Project Structure\n\n```\n" + treeText + "```\n\n---\n\n# File Contents\n\n";

      for (const filePath of selectedFilePaths) {
        const content = contents[filePath] || "[Error reading file]";
        const relativePath = rootPath ? filePath.replace(rootPath, "").replace(/^\//, "") : filePath;
        const langId = getLanguageId(filePath);
        
        output += `## File: ${relativePath}\n\n\`\`\`${langId}\n${content}\n\`\`\`\n\n`;
      }

      // Count tokens
      const tokens = countTokens(output);

      set({ generatedOutput: output, tokenCount: tokens, isGenerating: false });
    } catch (err) {
      console.error("Failed to generate context:", err);
      set({ 
        generatedOutput: `Error generating context: ${err}`, 
        tokenCount: 0, 
        isGenerating: false 
      });
    }
  },
}));
