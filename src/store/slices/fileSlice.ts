import { StateCreator } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "../types";
import {
  getAllPaths,
  getAllFilePaths,
  saveSessionState,
  addToRecentFolders,
  debounceTimer,
  setDebounceTimer,
} from "../helpers";
import type { EditorSlice } from "./editorSlice";
import type { UISlice } from "./uiSlice";
import type { SettingsSlice } from "./settingsSlice";

// =============================================================================
// FILE SLICE INTERFACE
// =============================================================================

export interface FileSlice {
  // --- State ---
  rootPath: string | null;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  orderedSelection: string[];
  isScanning: boolean;
  error: string | null;
  lastClickedPath: string | null;
  fileTokenMap: Map<string, number>;

  // --- Actions ---
  scanDirectory: (path: string) => Promise<void>;
  togglePath: (path: string, node: FileNode) => void;
  togglePathRange: (path: string, node: FileNode, shiftKey: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearFileTree: () => void;
  refreshDirectory: () => Promise<void>;
  reorderSelection: (orderedPaths: string[]) => void;
  getOrderedSelectedFiles: () => string[];
  getFileTokenPercentage: (path: string) => number;
  getFolderTokenPercentage: (node: FileNode) => number;
}

// Combined store type for cross-slice access
type AppState = FileSlice & EditorSlice & UISlice & SettingsSlice;

// =============================================================================
// FILE SLICE CREATOR
// =============================================================================

export const createFileSlice: StateCreator<
  AppState,
  [],
  [],
  FileSlice
> = (set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  rootPath: null,
  fileTree: null,
  selectedPaths: new Set(),
  orderedSelection: [],
  isScanning: false,
  error: null,
  lastClickedPath: null,
  fileTokenMap: new Map(),

  // ---------------------------------------------------------------------------
  // Actions - Directory Scanning
  // ---------------------------------------------------------------------------
  scanDirectory: async (path: string) => {
    set({ isScanning: true, error: null });
    try {
      const { getIgnoreSettings } = get();
      const ignoreSettings = getIgnoreSettings();
      
      const tree = await invoke<FileNode>("get_file_tree", { 
        basePath: path,
        customIgnorePatterns: null,
        ignoreSettings,
      });
      const { recentFolders } = get();
      const updatedRecent = addToRecentFolders(path, recentFolders);
      
      set({
        rootPath: path,
        fileTree: tree,
        selectedPaths: new Set(),
        orderedSelection: [],
        isScanning: false,
        generatedOutput: "",
        originalOutput: "",
        tokenCount: 0,
        recentFolders: updatedRecent,
        fileTokenMap: new Map(),
        sidebarCollapsed: false,
        hasManualEdits: false,
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

  // ---------------------------------------------------------------------------
  // Actions - File Selection
  // ---------------------------------------------------------------------------
  togglePath: (path: string, node: FileNode) => {
    const { selectedPaths, orderedSelection, generateContext, rootPath } = get();
    const newSelected = new Set(selectedPaths);
    let newOrdered = [...orderedSelection];
    
    // Get all paths for this node (if directory, includes all children)
    const pathsToToggle = getAllPaths(node);
    // Get only file paths (not directories) for ordering
    const filePathsToToggle = getAllFilePaths(node);
    
    // Check if this path is currently selected
    const isSelected = newSelected.has(path);
    
    if (isSelected) {
      // Remove all paths
      for (const p of pathsToToggle) {
        newSelected.delete(p);
      }
      // Remove files from ordered selection
      newOrdered = newOrdered.filter(p => !filePathsToToggle.includes(p));
    } else {
      // Add all paths
      for (const p of pathsToToggle) {
        newSelected.add(p);
      }
      // Add files to ordered selection (at the end)
      for (const fp of filePathsToToggle) {
        if (!newOrdered.includes(fp)) {
          newOrdered.push(fp);
        }
      }
    }
    
    // Update selection immediately for snappy UI
    set({ selectedPaths: newSelected, orderedSelection: newOrdered, lastClickedPath: path });
    
    // Save session state
    if (rootPath) {
      saveSessionState(rootPath, Array.from(newSelected));
    }
    
    // Debounce the heavy lifting (file reading, token counting)
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ isGenerating: true }); // Show loading state immediately
    setDebounceTimer(setTimeout(() => {
      generateContext();
    }, 400));
  },

  togglePathRange: (path: string, node: FileNode, shiftKey: boolean) => {
    const { selectedPaths, orderedSelection, generateContext, rootPath, fileTree, lastClickedPath } = get();
    
    // If shift is not pressed or no last clicked path, just do normal toggle
    if (!shiftKey || !lastClickedPath || !fileTree) {
      get().togglePath(path, node);
      return;
    }
    
    // Get flat list of all paths in order
    const allPaths = getAllPaths(fileTree);
    const lastIndex = allPaths.indexOf(lastClickedPath);
    const currentIndex = allPaths.indexOf(path);
    
    if (lastIndex === -1 || currentIndex === -1) {
      get().togglePath(path, node);
      return;
    }
    
    // Determine the range
    const startIndex = Math.min(lastIndex, currentIndex);
    const endIndex = Math.max(lastIndex, currentIndex);
    const pathsInRange = allPaths.slice(startIndex, endIndex + 1);
    // Get file paths in range for ordering
    const filePathsInRange = pathsInRange.filter(p => !p.endsWith('/'));
    
    const newSelected = new Set(selectedPaths);
    let newOrdered = [...orderedSelection];
    
    // Determine action based on the clicked item's current state
    const isSelected = newSelected.has(path);
    
    for (const p of pathsInRange) {
      if (isSelected) {
        newSelected.delete(p);
      } else {
        newSelected.add(p);
      }
    }
    
    // Update ordered selection for file paths
    if (isSelected) {
      // Remove deselected file paths
      newOrdered = newOrdered.filter(p => !filePathsInRange.includes(p));
    } else {
      // Add newly selected file paths
      for (const fp of filePathsInRange) {
        if (!newOrdered.includes(fp)) {
          newOrdered.push(fp);
        }
      }
    }
    
    // Update selection immediately for snappy UI
    set({ selectedPaths: newSelected, orderedSelection: newOrdered, lastClickedPath: path });
    
    // Save session state
    if (rootPath) {
      saveSessionState(rootPath, Array.from(newSelected));
    }
    
    // Debounce the heavy lifting (file reading, token counting)
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ isGenerating: true }); // Show loading state immediately
    setDebounceTimer(setTimeout(() => {
      generateContext();
    }, 400));
  },

  selectAll: () => {
    const { fileTree, generateContext, rootPath } = get();
    if (fileTree) {
      const allPaths = getAllPaths(fileTree);
      const allFilePaths = getAllFilePaths(fileTree);
      set({ selectedPaths: new Set(allPaths), orderedSelection: allFilePaths });
      
      // Save session state
      if (rootPath) {
        saveSessionState(rootPath, allPaths);
      }
      
      // Debounce the heavy lifting
      if (debounceTimer) clearTimeout(debounceTimer);
      set({ isGenerating: true });
      setDebounceTimer(setTimeout(() => {
        generateContext();
      }, 400));
    }
  },

  deselectAll: () => {
    const { rootPath } = get();
    // Cancel any pending generation
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ 
      selectedPaths: new Set(),
      orderedSelection: [], 
      generatedOutput: "", 
      originalOutput: "",
      tokenCount: 0, 
      isGenerating: false,
      fileTokenMap: new Map(),
      hasManualEdits: false,
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
      orderedSelection: [],
      error: null,
      generatedOutput: "",
      originalOutput: "",
      tokenCount: 0,
      isGenerating: false,
      fileTokenMap: new Map(),
      hasManualEdits: false,
    });
  },

  refreshDirectory: async () => {
    const { rootPath, getIgnoreSettings, selectedPaths, orderedSelection, generateContext } = get();
    if (!rootPath) return;
    
    // Save current selections before refresh
    const savedSelectedPaths = new Set(selectedPaths);
    const savedOrderedSelection = [...orderedSelection];
    
    set({ isRefreshing: true, isScanning: true, error: null });
    
    try {
      const ignoreSettings = getIgnoreSettings();
      
      const tree = await invoke<FileNode>("get_file_tree", { 
        basePath: rootPath,
        customIgnorePatterns: null,
        ignoreSettings,
      });
      
      // Get all valid paths from the new tree
      const validPaths = new Set(getAllPaths(tree));
      
      // Filter selections to only include paths that still exist
      const filteredSelectedPaths = new Set(
        [...savedSelectedPaths].filter(p => validPaths.has(p))
      );
      const filteredOrderedSelection = savedOrderedSelection.filter(p => validPaths.has(p));
      
      set({
        fileTree: tree,
        selectedPaths: filteredSelectedPaths,
        orderedSelection: filteredOrderedSelection,
        isScanning: false,
      });
      
      // Regenerate context if there are still selected files
      if (filteredSelectedPaths.size > 0) {
        await generateContext();
      }
      
      set({ isRefreshing: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isScanning: false,
        isRefreshing: false,
      });
      throw err; // Re-throw so caller can catch it
    }
  },

  // ---------------------------------------------------------------------------
  // Actions - Ordered Selection (Drag & Drop Reordering)
  // ---------------------------------------------------------------------------
  reorderSelection: (orderedPaths: string[]) => {
    const { generateContext } = get();
    set({ orderedSelection: orderedPaths });
    
    // Regenerate context with new order
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ isGenerating: true });
    setDebounceTimer(setTimeout(() => {
      generateContext();
    }, 400));
  },

  getOrderedSelectedFiles: () => {
    const { orderedSelection, selectedPaths, fileTree } = get();
    
    // If we have an ordered selection, use it (filtered to current selection)
    if (orderedSelection.length > 0) {
      return orderedSelection.filter(p => selectedPaths.has(p));
    }
    
    // Fall back to tree order
    if (!fileTree) return [];
    const allFilePaths = getAllFilePaths(fileTree);
    return allFilePaths.filter(p => selectedPaths.has(p));
  },

  // ---------------------------------------------------------------------------
  // Actions - Token Tracking
  // ---------------------------------------------------------------------------
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
});
