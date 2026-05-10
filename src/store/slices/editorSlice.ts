import { StateCreator } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  getAllFilePaths,
  generateTreeText,
  getLanguageId,
  countTokens,
  applyPrivacyFilter,
  nextGenerationId,
  getCurrentGenerationId,
  tokenCountTimer,
  setTokenCountTimer,
} from "../helpers";
import type { FileSlice } from "./fileSlice";
import type { UISlice } from "./uiSlice";
import type { SettingsSlice } from "./settingsSlice";

// =============================================================================
// EDITOR SLICE INTERFACE
// =============================================================================

export interface EditorSlice {
  // --- State ---
  generatedOutput: string;
  originalOutput: string;
  tokenCount: number;
  isGenerating: boolean;
  isPrivacyFilterEnabled: boolean;
  hasManualEdits: boolean; // Tracks if user has manually edited since last generation

  // --- Actions ---
  generateContext: () => Promise<void>;
  setGeneratedOutput: (output: string) => void;
  togglePrivacyFilter: () => void;
  setPrivacyFilterEnabled: (enabled: boolean) => void;
}

// Combined store type for cross-slice access
type AppState = FileSlice & EditorSlice & UISlice & SettingsSlice;

// =============================================================================
// EDITOR SLICE CREATOR
// =============================================================================

export const createEditorSlice: StateCreator<
  AppState,
  [],
  [],
  EditorSlice
> = (set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  generatedOutput: "",
  originalOutput: "",
  tokenCount: 0,
  isGenerating: false,
  isPrivacyFilterEnabled: true, // Default to true for safety
  hasManualEdits: false,

  // ---------------------------------------------------------------------------
  // Actions - Context Generation (with race condition fix)
  // ---------------------------------------------------------------------------
  generateContext: async () => {
    const { fileTree, selectedPaths, orderedSelection, rootPath, isPrivacyFilterEnabled, maxFileSizeKb, outputFormat } = get();
    
    if (!fileTree || selectedPaths.size === 0) {
      set({ generatedOutput: "", originalOutput: "", tokenCount: 0, isGenerating: false, fileTokenMap: new Map(), hasManualEdits: false });
      return;
    }

    // Capture a generation ID to detect stale results from out-of-order async completions.
    // If a newer generation is triggered while this one is in-flight, we bail on return.
    const generationId = nextGenerationId();

    // isGenerating is already set by the debounced caller
    try {
      // Use orderedSelection if available, otherwise fall back to tree order
      let selectedFilePaths: string[];
      if (orderedSelection.length > 0) {
        // Use the user's custom ordering, filtered to only include currently selected files
        selectedFilePaths = orderedSelection.filter(p => selectedPaths.has(p));
      } else {
        // Fall back to tree order for backward compatibility
        const allFilePaths = getAllFilePaths(fileTree);
        selectedFilePaths = allFilePaths.filter(p => selectedPaths.has(p));
      }

      if (selectedFilePaths.length === 0) {
        set({ generatedOutput: "", originalOutput: "", tokenCount: 0, isGenerating: false, fileTokenMap: new Map(), hasManualEdits: false });
        return;
      }

      // Generate tree structure
      const treeText = generateTreeText(fileTree);

      // Read file contents from Rust backend in batches to avoid massive IPC payloads.
      // Without batching, 1000 files × 50KB = a 50MB JSON blob that freezes the browser.
      const BATCH_SIZE = 50;
      const contents: Record<string, string> = {};
      for (let i = 0; i < selectedFilePaths.length; i += BATCH_SIZE) {
        const batch = selectedFilePaths.slice(i, i + BATCH_SIZE);
        const batchContents = await invoke<Record<string, string>>("read_files_contents", {
          filePaths: batch,
          maxFileSizeKb,
        });

        // Race condition guard: bail if a newer generation was triggered during the await
        if (generationId !== getCurrentGenerationId()) return;

        Object.assign(contents, batchContents);
      }

      // Final race condition guard after all batches complete
      if (generationId !== getCurrentGenerationId()) return;

      // Build the output and track per-file tokens
      let output = "";
      const newFileTokenMap = new Map<string, number>();

      if (outputFormat === "xml") {
        // XML format for Claude and similar models
        output = `<project_structure>\n${treeText}</project_structure>\n\n<file_contents>\n`;
        
        for (const filePath of selectedFilePaths) {
          const content = contents[filePath] || "[Error reading file]";
          const relativePath = rootPath ? filePath.replace(rootPath, "").replace(/^\//, "") : filePath;
          
          const fileSection = `<file path="${relativePath}">\n${content}\n</file>\n\n`;
          output += fileSection;
          
          // Count tokens for this file
          const fileTokens = countTokens(fileSection);
          newFileTokenMap.set(filePath, fileTokens);
        }
        
        output += `</file_contents>`;
      } else {
        // Markdown format (default)
        output = "# Project Structure\n\n```\n" + treeText + "```\n\n---\n\n# File Contents\n\n";

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
        hasManualEdits: false, // Fresh generation = no manual edits
      });
    } catch (err) {
      // Only set error state if this generation is still current
      if (generationId !== getCurrentGenerationId()) return;

      console.error("Failed to generate context:", err);
      set({ 
        generatedOutput: `Error generating context: ${err}`, 
        originalOutput: "",
        tokenCount: 0, 
        isGenerating: false,
        fileTokenMap: new Map(),
        hasManualEdits: false,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // Actions - Manual Editor Changes (with privacy filter data loss fix)
  // ---------------------------------------------------------------------------
  setGeneratedOutput: (output: string) => {
    const { isPrivacyFilterEnabled } = get();
    
    // When user edits, we update both displayed and original.
    // The user's edit becomes the new ground truth, regardless of filter state.
    const finalOutput = isPrivacyFilterEnabled ? applyPrivacyFilter(output) : output;
    
    // Update output immediately for responsive typing
    set({ 
      generatedOutput: finalOutput,
      // FIX: Always preserve user edits as ground truth.
      // Previously, originalOutput was never updated when privacy filter was ON,
      // causing edits to be lost when toggling the filter.
      originalOutput: output,
      hasManualEdits: true,
    });
    
    // Debounce token counting for performance (500ms delay)
    if (tokenCountTimer) clearTimeout(tokenCountTimer);
    setTokenCountTimer(setTimeout(() => {
      const tokens = countTokens(finalOutput);
      set({ tokenCount: tokens });
    }, 500));
  },

  // ---------------------------------------------------------------------------
  // Actions - Privacy Filter
  // ---------------------------------------------------------------------------
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
});
