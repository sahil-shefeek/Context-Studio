import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

// Types matching the Rust FileNode structure
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

interface AppState {
  // State
  rootPath: string | null;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  isScanning: boolean;
  error: string | null;

  // Actions
  scanDirectory: (path: string) => Promise<void>;
  togglePath: (path: string, node: FileNode) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearFileTree: () => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  rootPath: null,
  fileTree: null,
  selectedPaths: new Set(),
  isScanning: false,
  error: null,

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
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isScanning: false,
      });
    }
  },

  togglePath: (path: string, node: FileNode) => {
    const { selectedPaths } = get();
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
    
    set({ selectedPaths: newSelected });
  },

  selectAll: () => {
    const { fileTree } = get();
    if (fileTree) {
      const allPaths = getAllPaths(fileTree);
      set({ selectedPaths: new Set(allPaths) });
    }
  },

  deselectAll: () => {
    set({ selectedPaths: new Set() });
  },

  clearFileTree: () => {
    set({
      rootPath: null,
      fileTree: null,
      selectedPaths: new Set(),
      error: null,
    });
  },
}));
