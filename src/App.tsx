import { useEffect, useCallback } from "react";
import { Sidebar, MainContent, TitleBar, FilePreviewModal, SettingsModal } from "./components";
import { useAppStore } from "./store/appStore";
import { useShallow } from "zustand/react/shallow";
import { open } from "@tauri-apps/plugin-dialog";
import { Toaster } from "./components/ui";

function App() {
  const { 
    theme, 
    previewFile, 
    closeFilePreview, 
    restoreSession,
    openSettings,
    clearFileTree,
    scanDirectory,
  } = useAppStore(useShallow((s) => ({
    theme: s.theme,
    previewFile: s.previewFile,
    closeFilePreview: s.closeFilePreview,
    restoreSession: s.restoreSession,
    openSettings: s.openSettings,
    clearFileTree: s.clearFileTree,
    getOutputWithTemplate: s.getOutputWithTemplate,
    scanDirectory: s.scanDirectory,
  })));

  // Handle opening folder via keyboard shortcut
  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select a folder to scan",
      });

      if (selected && typeof selected === "string") {
        await scanDirectory(selected);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  }, [scanDirectory]);

  // Handle copy context via keyboard shortcut
  const handleCopyContext = useCallback(async () => {
    const output = useAppStore.getState().getOutputWithTemplate();
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Apply theme class on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Restore previous session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Disable browser context menu globally for native app feel
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable ||
                        target.closest('.cm-editor'); // CodeMirror editor
      
      if (cmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFolder();
      } else if (cmdOrCtrl && e.key === ',') {
        e.preventDefault();
        openSettings();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clearFileTree();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'c' && !isEditing) {
        // Fix for "Copy" hijacking: only copy context if no text is selected
        const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0;
        if (!hasSelection) {
          const state = useAppStore.getState();
          if (state.generatedOutput) {
            e.preventDefault();
            handleCopyContext();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFolder, openSettings, clearFileTree, handleCopyContext]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          filePath={previewFile.path}
          fileName={previewFile.name}
          content={previewFile.content}
          onClose={closeFilePreview}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal />
      
      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export default App;
