import { Filter, RefreshCw } from "lucide-react";
import { useAppStore, FRAMEWORK_PRESETS } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useState, useEffect } from "react";
import { Button, Switch, Checkbox, Textarea, Separator } from "../ui";

export function IgnoreSettings() {
  const {
    customIgnorePatterns,
    setCustomIgnorePatterns,
    rootPath,
    scanDirectory,
    respectGitignore,
    setRespectGitignore,
    respectDockerignore,
    setRespectDockerignore,
    respectAiignore,
    setRespectAiignore,
    frameworkPresets,
    toggleFrameworkPreset,
    isSettingsOpen,
  } = useAppStore(useShallow((s) => ({
    customIgnorePatterns: s.customIgnorePatterns,
    setCustomIgnorePatterns: s.setCustomIgnorePatterns,
    rootPath: s.rootPath,
    scanDirectory: s.scanDirectory,
    respectGitignore: s.respectGitignore,
    setRespectGitignore: s.setRespectGitignore,
    respectDockerignore: s.respectDockerignore,
    setRespectDockerignore: s.setRespectDockerignore,
    respectAiignore: s.respectAiignore,
    setRespectAiignore: s.setRespectAiignore,
    frameworkPresets: s.frameworkPresets,
    toggleFrameworkPreset: s.toggleFrameworkPreset,
    isSettingsOpen: s.isSettingsOpen,
  })));

  const [localIgnorePatterns, setLocalIgnorePatterns] = useState(customIgnorePatterns);
  const [patternsChanged, setPatternsChanged] = useState(false);

  // Sync local state with store when opening
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalIgnorePatterns(customIgnorePatterns);
      setPatternsChanged(false);
    }
  }, [isSettingsOpen, customIgnorePatterns]);

  const handleIgnorePatternsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalIgnorePatterns(e.target.value);
    setPatternsChanged(e.target.value !== customIgnorePatterns);
  };

  const handleApplyIgnorePatterns = async () => {
    setCustomIgnorePatterns(localIgnorePatterns);
    setPatternsChanged(false);
    if (rootPath) {
      await scanDirectory(rootPath);
    }
  };

  return (
    <div className="space-y-6">
      {/* Respect Ignore Files */}
      <section>
        <h3 className="text-sm font-medium text-(--text-primary) mb-3">Respect Ignore Files</h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
          {[
            { key: "gitignore", label: ".gitignore", enabled: respectGitignore, toggle: setRespectGitignore },
            { key: "aiignore", label: ".aiignore", enabled: respectAiignore, toggle: setRespectAiignore },
            { key: "dockerignore", label: ".dockerignore", enabled: respectDockerignore, toggle: setRespectDockerignore },
          ].map(({ key, label, enabled, toggle }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-(--text-primary)">{label}</span>
              <Switch
                checked={enabled}
                onCheckedChange={toggle}
              />
            </label>
          ))}
          <p className="text-xs text-(--text-muted) pt-2">
            When enabled, files matching patterns in these files will be hidden from the tree
          </p>
        </div>
      </section>

      <Separator />

      {/* Framework Presets */}
      <section>
        <h3 className="text-sm font-medium text-(--text-primary) mb-3">Framework Presets</h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2">
            {FRAMEWORK_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-(--bg-secondary) transition-colors"
              >
                <Checkbox
                  checked={frameworkPresets.includes(preset.id)}
                  onCheckedChange={() => toggleFrameworkPreset(preset.id)}
                />
                <span className="text-sm text-(--text-primary)">{preset.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-(--text-muted) mt-3">
            Select frameworks to automatically ignore their build artifacts and dependencies
          </p>
        </div>
      </section>

      <Separator />

      {/* Custom Ignore Patterns */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <Filter className="w-4 h-4 text-(--accent-color)" />
          Custom Patterns
        </h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1">
              Patterns (one per line)
            </label>
            <Textarea
              value={localIgnorePatterns}
              onChange={handleIgnorePatternsChange}
              rows={6}
              placeholder={"# Example patterns:\n*.log\n*.tmp\ntest_data\nsecrets.json"}
              className="font-mono"
            />
            <p className="text-xs text-(--text-muted) mt-1">
              Use *.ext for extensions, folder names, or # for comments
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
    </div>
  );
}
