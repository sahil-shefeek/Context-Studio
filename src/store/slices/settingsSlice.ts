import { StateCreator } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FileNode, Theme, ResolvedTheme, OutputFormat, IgnoreSettings, RecentFolder, PromptTemplate } from "../types";
import { DEFAULT_TEMPLATES } from "../types";
import {
  resolveTheme,
  getInitialTheme,
  loadRecentFoldersFromStorage,
  saveRecentFolders,
  loadSelectedTemplateFromStorage,
  saveSelectedTemplate,
  loadTargetContextWindow,
  saveTargetContextWindow,
  loadCustomIgnorePatterns,
  saveCustomIgnorePatterns,
  loadOutputFormat,
  saveOutputFormat,
  loadRestoreSessionOnStartup,
  saveRestoreSessionOnStartup,
  loadMaxFileSizeKb,
  saveMaxFileSizeKb,
  loadRespectGitignore,
  saveRespectGitignore,
  loadRespectDockerignore,
  saveRespectDockerignore,
  loadRespectAiignore,
  saveRespectAiignore,
  loadFrameworkPresets,
  saveFrameworkPresets,
  loadCustomTemplates,
  saveCustomTemplates,
  getAllTemplates,
  loadSessionState,
  clearSessionState,
  addToRecentFolders,
  getAllPaths,
  debounceTimer,
  setDebounceTimer,
} from "../helpers";
import type { FileSlice } from "./fileSlice";
import type { EditorSlice } from "./editorSlice";
import type { UISlice } from "./uiSlice";

// =============================================================================
// SETTINGS SLICE INTERFACE
// =============================================================================

export interface SettingsSlice {
  // --- State ---
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  targetContextWindow: number;
  customIgnorePatterns: string;
  outputFormat: OutputFormat;
  restoreSessionOnStartup: boolean;
  maxFileSizeKb: number;
  respectGitignore: boolean;
  respectDockerignore: boolean;
  respectAiignore: boolean;
  frameworkPresets: string[];
  recentFolders: RecentFolder[];
  promptTemplates: PromptTemplate[];
  selectedTemplateId: string;

  // --- Actions ---
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setTargetContextWindow: (tokens: number) => void;
  setCustomIgnorePatterns: (patterns: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  getContextPercentage: () => number;
  getContextStatus: () => 'green' | 'yellow' | 'red';
  setRestoreSessionOnStartup: (enabled: boolean) => void;
  setMaxFileSizeKb: (size: number) => void;
  setRespectGitignore: (enabled: boolean) => void;
  setRespectDockerignore: (enabled: boolean) => void;
  setRespectAiignore: (enabled: boolean) => void;
  setFrameworkPresets: (presets: string[]) => void;
  toggleFrameworkPreset: (preset: string) => void;
  getIgnoreSettings: () => IgnoreSettings;
  loadRecentFolders: () => void;
  openRecentFolder: (path: string) => Promise<void>;
  removeRecentFolder: (path: string) => void;
  clearAllRecentFolders: () => void;
  setSelectedTemplate: (templateId: string) => void;
  getOutputWithTemplate: () => string;
  addTemplate: (name: string, text: string) => void;
  updateTemplate: (id: string, name: string, text: string) => void;
  deleteTemplate: (id: string) => void;
  resetTemplatesToDefault: () => void;
  clearAllStorage: () => void;
  restoreSession: () => Promise<void>;
  syncSystemTheme: () => void;
}

// Combined store type for cross-slice access
type AppState = FileSlice & EditorSlice & UISlice & SettingsSlice;

const initialTheme = getInitialTheme();

// =============================================================================
// SETTINGS SLICE CREATOR
// =============================================================================

export const createSettingsSlice: StateCreator<
  AppState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  targetContextWindow: loadTargetContextWindow(),
  customIgnorePatterns: loadCustomIgnorePatterns(),
  outputFormat: loadOutputFormat(),
  restoreSessionOnStartup: loadRestoreSessionOnStartup(),
  maxFileSizeKb: loadMaxFileSizeKb(),
  respectGitignore: loadRespectGitignore(),
  respectDockerignore: loadRespectDockerignore(),
  respectAiignore: loadRespectAiignore(),
  frameworkPresets: loadFrameworkPresets(),
  recentFolders: loadRecentFoldersFromStorage(),
  promptTemplates: getAllTemplates(),
  selectedTemplateId: loadSelectedTemplateFromStorage(),

  // ---------------------------------------------------------------------------
  // Actions - Theme
  // ---------------------------------------------------------------------------
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

  syncSystemTheme: () => {
    const { theme } = get();
    if (theme === "system") {
      const resolved = resolveTheme("system");
      document.documentElement.classList.toggle("dark", resolved === "dark");
      set({ resolvedTheme: resolved });
    }
  },

  // ---------------------------------------------------------------------------
  // Actions - Context Window Settings
  // ---------------------------------------------------------------------------
  setTargetContextWindow: (tokens: number) => {
    saveTargetContextWindow(tokens);
    set({ targetContextWindow: tokens });
  },

  setCustomIgnorePatterns: (patterns: string) => {
    saveCustomIgnorePatterns(patterns);
    set({ customIgnorePatterns: patterns });
  },

  setOutputFormat: (format: OutputFormat) => {
    saveOutputFormat(format);
    set({ outputFormat: format });
    // Regenerate context with new format
    const { generateContext, selectedPaths } = get();
    if (selectedPaths.size > 0) {
      set({ isGenerating: true });
      if (debounceTimer) clearTimeout(debounceTimer);
      setDebounceTimer(setTimeout(() => {
        generateContext();
      }, 100));
    }
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

  // ---------------------------------------------------------------------------
  // Actions - General Settings
  // ---------------------------------------------------------------------------
  setRestoreSessionOnStartup: (enabled: boolean) => {
    saveRestoreSessionOnStartup(enabled);
    set({ restoreSessionOnStartup: enabled });
  },

  setMaxFileSizeKb: (size: number) => {
    saveMaxFileSizeKb(size);
    set({ maxFileSizeKb: size });
  },

  // ---------------------------------------------------------------------------
  // Actions - Ignore Settings
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Actions - Recent Folders
  // ---------------------------------------------------------------------------
  loadRecentFolders: () => {
    const folders = loadRecentFoldersFromStorage();
    set({ recentFolders: folders });
  },

  openRecentFolder: async (path: string) => {
    const { scanDirectory } = get();
    await scanDirectory(path);
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

  // ---------------------------------------------------------------------------
  // Actions - Prompt Templates
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Actions - Storage Management
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Actions - Session Restore
  // ---------------------------------------------------------------------------
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
});
