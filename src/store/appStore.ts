import { create } from "zustand";
import {
  createFileSlice,
  createEditorSlice,
  createUISlice,
  createSettingsSlice,
  type FileSlice,
  type EditorSlice,
  type UISlice,
  type SettingsSlice,
} from "./slices";

// =============================================================================
// COMBINED STORE TYPE
// =============================================================================

type AppState = FileSlice & EditorSlice & UISlice & SettingsSlice;

// =============================================================================
// COMBINED STORE
// =============================================================================

export const useAppStore = create<AppState>()((...a) => ({
  ...createFileSlice(...a),
  ...createEditorSlice(...a),
  ...createUISlice(...a),
  ...createSettingsSlice(...a),
}));

// =============================================================================
// RE-EXPORTS (backward compatibility)
// =============================================================================

// Types
export type {
  FileNode,
  Theme,
  ResolvedTheme,
  OutputFormat,
  IgnoreSettings,
  RecentFolder,
  PromptTemplate,
} from "./types";

// Constants
export { FRAMEWORK_PRESETS } from "./types";

// Slice types (for advanced usage)
export type { FileSlice, EditorSlice, UISlice, SettingsSlice };
