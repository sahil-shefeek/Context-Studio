import { Trash2, FolderOpen, Palette } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { Button, Switch, Separator } from "../ui";

export function GeneralSettings() {
  const {
    recentFolders,
    clearAllRecentFolders,
    clearAllStorage,
    theme,
    setTheme,
    restoreSessionOnStartup,
    setRestoreSessionOnStartup,
  } = useAppStore();

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

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <Palette className="w-4 h-4 text-(--accent-color)" />
          Theme
        </h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4">
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                  theme === t
                    ? "bg-(--accent-color) border-(--accent-color) text-white"
                    : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color) hover:text-(--text-primary)"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-(--text-muted) mt-2">
            "System" follows your OS preference automatically.
          </p>
        </div>
      </section>

      <Separator />

      {/* Session Restore */}
      <section>
        <h3 className="text-sm font-medium text-(--text-primary) mb-3">Startup Behavior</h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-(--text-primary)">Restore previous session on startup</span>
              <p className="text-xs text-(--text-muted) mt-0.5">
                Automatically reopen your last project and file selection
              </p>
            </div>
            <Switch
              checked={restoreSessionOnStartup}
              onCheckedChange={setRestoreSessionOnStartup}
            />
          </label>
        </div>
      </section>

      <Separator />

      {/* Data Management Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <FolderOpen className="w-4 h-4 text-(--accent-color)" />
          Data Management
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-(--text-primary)">Recent Folders</p>
              <p className="text-xs text-(--text-muted)">
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

          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-(--text-primary)">All Stored Data</p>
              <p className="text-xs text-(--text-muted)">
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
    </div>
  );
}
