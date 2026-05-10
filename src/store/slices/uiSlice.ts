import { StateCreator } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FileSlice } from "./fileSlice";
import type { EditorSlice } from "./editorSlice";
import type { SettingsSlice } from "./settingsSlice";

// =============================================================================
// UI SLICE INTERFACE
// =============================================================================

export interface UISlice {
  // --- State ---
  sidebarCollapsed: boolean;
  previewFile: { path: string; name: string; content: string } | null;
  isExporting: boolean;
  isRefreshing: boolean;
  isSettingsOpen: boolean;

  // --- Actions ---
  toggleSidebar: () => void;
  openFilePreview: (path: string, name: string) => Promise<void>;
  closeFilePreview: () => void;
  setExporting: (exporting: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

// Combined store type for cross-slice access
type AppState = FileSlice & EditorSlice & UISlice & SettingsSlice;

// =============================================================================
// UI SLICE CREATOR
// =============================================================================

export const createUISlice: StateCreator<
  AppState,
  [],
  [],
  UISlice
> = (set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  sidebarCollapsed: true,
  previewFile: null,
  isExporting: false,
  isRefreshing: false,
  isSettingsOpen: false,

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
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

  setExporting: (exporting: boolean) => {
    set({ isExporting: exporting });
  },

  openSettings: () => {
    set({ isSettingsOpen: true });
  },

  closeSettings: () => {
    set({ isSettingsOpen: false });
  },
});
