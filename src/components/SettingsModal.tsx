import { X, Trash2, Info, Github, FolderOpen, Gauge, Filter, RefreshCw } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { Button } from "./ui";
import { useState } from "react";

export function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    clearAllStorage,
    recentFolders,
    clearAllRecentFolders,
    targetContextWindow,
    setTargetContextWindow,
    customIgnorePatterns,
    setCustomIgnorePatterns,
    rootPath,
    scanDirectory,
  } = useAppStore();

  const [localContextWindow, setLocalContextWindow] = useState(targetContextWindow.toString());
  const [localIgnorePatterns, setLocalIgnorePatterns] = useState(customIgnorePatterns);
  const [patternsChanged, setPatternsChanged] = useState(false);

  if (!isSettingsOpen) return null;

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all stored data? This will remove recent folders and session state.")) {
      clearAllStorage();
    }
  };

  const handleClearRecent = () => {
    if (confirm("Clear all recent folders?")) {
      clearAllRecentFolders();
    }
  };

  const handleContextWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalContextWindow(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setTargetContextWindow(num);
    }
  };

  const handleIgnorePatternsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalIgnorePatterns(e.target.value);
    setPatternsChanged(e.target.value !== customIgnorePatterns);
  };

  const handleApplyIgnorePatterns = async () => {
    setCustomIgnorePatterns(localIgnorePatterns);
    setPatternsChanged(false);
    // Re-scan the current folder if one is open
    if (rootPath) {
      await scanDirectory(rootPath);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
    >
      <div className="relative w-full max-w-lg mx-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <Button variant="ghost" size="icon-sm" onClick={closeSettings}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* Context Window Settings */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
              <Gauge className="w-4 h-4 text-[var(--accent-color)]" />
              Context Window Settings
            </h3>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Target Context Window (tokens)
                </label>
                <input
                  type="number"
                  value={localContextWindow}
                  onChange={handleContextWindowChange}
                  min="1000"
                  step="1000"
                  className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Set the target token limit for your AI model (e.g., 128000 for GPT-4, 200000 for Claude)
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[32000, 64000, 128000, 200000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setLocalContextWindow(preset.toString());
                      setTargetContextWindow(preset);
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      targetContextWindow === preset
                        ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white"
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)]"
                    }`}
                  >
                    {(preset / 1000)}K
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Custom Ignore Patterns */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
              <Filter className="w-4 h-4 text-[var(--accent-color)]" />
              Custom Ignore Patterns
            </h3>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Patterns (one per line)
                </label>
                <textarea
                  value={localIgnorePatterns}
                  onChange={handleIgnorePatternsChange}
                  rows={5}
                  placeholder={"# Example patterns:\n*.log\n*.tmp\ntest_data\nsecrets.json"}
                  className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] font-mono resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Use *.ext for extensions, folder names, or # for comments. Applied in addition to built-in ignores.
                </p>
              </div>
              {patternsChanged && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyIgnorePatterns}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Apply & Rescan Project
                </Button>
              )}
            </div>
          </section>

          {/* App Info Section */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
              <Info className="w-4 h-4 text-[var(--accent-color)]" />
              About
            </h3>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-color)] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CC</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Context Catcher</h4>
                  <p className="text-xs text-[var(--text-muted)]">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] pt-2">
                Aggregate project files into AI-friendly markdown context. Built with Tauri 2.0 + React.
              </p>
              <a
                href="https://github.com/sahilsuman933/context-catcher"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--accent-color)] hover:underline pt-1"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </section>

          {/* Data Management Section */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
              <FolderOpen className="w-4 h-4 text-[var(--accent-color)]" />
              Data Management
            </h3>
            <div className="space-y-3">
              {/* Recent Folders Info */}
              <div className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Recent Folders</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {recentFolders.length} folder{recentFolders.length !== 1 ? "s" : ""} saved
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRecent}
                  disabled={recentFolders.length === 0}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>

              {/* Clear All */}
              <div className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">All Stored Data</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Recent folders, session state, preferences
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded px-3 py-2">
                <span className="text-[var(--text-secondary)]">Copy Output</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  ⌘C
                </kbd>
              </div>
              <div className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded px-3 py-2">
                <span className="text-[var(--text-secondary)]">Export</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  ⌘S
                </kbd>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] shrink-0">
          <p className="text-xs text-center text-[var(--text-muted)]">
            Made with ❤️ for AI-assisted development
          </p>
        </div>
      </div>
    </div>
  );
}
