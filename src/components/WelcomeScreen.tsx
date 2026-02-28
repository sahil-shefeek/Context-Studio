import { FolderOpen, Clock, X, BookOpen, Settings } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import logoImg from "../assets/logo-1-no-bg.png";

interface WelcomeScreenProps {
  onOpenDocumentation: () => void;
}

export function WelcomeScreen({ onOpenDocumentation }: WelcomeScreenProps) {
  const {
    recentFolders,
    openRecentFolder,
    removeRecentFolder,
    openSettings,
    scanDirectory,
  } = useAppStore();

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  // Limit recent folders to 5 unique paths
  const displayRecentFolders = useMemo(() => {
    const seen = new Set<string>();
    return recentFolders
      .filter(folder => {
        if (seen.has(folder.path)) return false;
        seen.add(folder.path);
        return true;
      })
      .slice(0, 5);
  }, [recentFolders]);

  // Handle opening folder
  const handleOpenFolder = async () => {
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
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in duration-300 overflow-y-auto py-8">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
        <img src={logoImg} alt="Context Studio" className="w-16 h-16" />
      </div>
      <h2 className="text-2xl font-semibold text-(--text-primary) mb-2">Welcome to Context Studio</h2>
      <p className="text-(--text-secondary) max-w-md mb-8">
        Open a folder to scan your project files and generate AI-friendly context.
      </p>

      {/* Quick Start Section */}
      <div className="w-full max-w-2xl mb-8">
        <h3 className="text-sm font-medium text-(--text-muted) uppercase tracking-wider mb-4">Quick Start</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-4 p-4 rounded-xl bg-(--bg-secondary) hover:bg-(--bg-tertiary) border border-(--border-color) hover:border-(--accent-color) transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-(--accent-color)/10 flex items-center justify-center group-hover:bg-(--accent-color)/20 transition-colors">
              <FolderOpen className="w-6 h-6 text-(--accent-color)" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-semibold text-(--text-primary) group-hover:text-(--accent-color) transition-colors">
                Open Folder
              </span>
              <span className="text-xs text-(--text-muted)">
                <kbd className="px-1.5 py-0.5 rounded bg-(--bg-tertiary) text-[10px]">{cmdKey} O</kbd>
              </span>
            </div>
          </button>
          <button
            onClick={onOpenDocumentation}
            className="flex items-center gap-4 p-4 rounded-xl bg-(--bg-secondary) hover:bg-(--bg-tertiary) border border-(--border-color) hover:border-green-500 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <BookOpen className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-semibold text-(--text-primary) group-hover:text-green-500 transition-colors">
                Documentation
              </span>
              <span className="text-xs text-(--text-muted)">
                Learn best practices
              </span>
            </div>
          </button>
          <button
            onClick={openSettings}
            className="flex items-center gap-4 p-4 rounded-xl bg-(--bg-secondary) hover:bg-(--bg-tertiary) border border-(--border-color) hover:border-purple-500 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-semibold text-(--text-primary) group-hover:text-purple-500 transition-colors">
                Settings
              </span>
              <span className="text-xs text-(--text-muted)">
                <kbd className="px-1.5 py-0.5 rounded bg-(--bg-tertiary) text-[10px]">{cmdKey} ,</kbd>
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Folders as Project Cards */}
      {displayRecentFolders.length > 0 && (
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 mb-4 text-(--text-muted)">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Recent Projects</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {displayRecentFolders.map((folder) => (
              <div
                key={folder.path}
                className="relative group"
              >
                <button
                  onClick={() => openRecentFolder(folder.path)}
                  className="w-full flex flex-col p-4 rounded-xl bg-(--bg-secondary) hover:bg-(--bg-tertiary) border border-(--border-color) hover:border-(--accent-color) transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-(--accent-color)/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-(--accent-color)" />
                    </div>
                    <span className="text-base font-semibold text-(--text-primary) truncate group-hover:text-(--accent-color) transition-colors">
                      {folder.name}
                    </span>
                  </div>
                  <span className="text-xs text-(--text-muted) truncate pl-[52px]">
                    {folder.path}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentFolder(folder.path);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-(--bg-tertiary) hover:bg-red-500/20 text-(--text-muted) hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from recent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
