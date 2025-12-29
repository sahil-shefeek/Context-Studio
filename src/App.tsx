import { useEffect } from "react";
import { Sidebar, MainContent, TitleBar, FilePreviewModal, SettingsModal } from "./components";
import { useAppStore } from "./store/appStore";

function App() {
  const { theme, previewFile, closeFilePreview, restoreSession } = useAppStore();

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
    </div>
  );
}

export default App;
