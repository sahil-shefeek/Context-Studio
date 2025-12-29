import { 
  X, 
  Trash2, 
  Info, 
  Github, 
  FolderOpen, 
  Gauge, 
  Filter, 
  RefreshCw, 
  Settings, 
  Palette, 
  FileText, 
  Plus,
  Edit2,
  Check,
  XCircle,
} from "lucide-react";
import { useAppStore, FRAMEWORK_PRESETS, PromptTemplate } from "../store/appStore";
import { Button } from "./ui";
import { useState, useEffect } from "react";

type SettingsTab = "general" | "context" | "ignore" | "templates" | "about";

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
    theme,
    setTheme,
    restoreSessionOnStartup,
    setRestoreSessionOnStartup,
    maxFileSizeKb,
    setMaxFileSizeKb,
    respectGitignore,
    setRespectGitignore,
    respectDockerignore,
    setRespectDockerignore,
    respectAiignore,
    setRespectAiignore,
    frameworkPresets,
    toggleFrameworkPreset,
    promptTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [localContextWindow, setLocalContextWindow] = useState(targetContextWindow.toString());
  const [localIgnorePatterns, setLocalIgnorePatterns] = useState(customIgnorePatterns);
  const [patternsChanged, setPatternsChanged] = useState(false);
  const [localMaxFileSize, setLocalMaxFileSize] = useState(maxFileSizeKb.toString());
  
  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateText, setNewTemplateText] = useState("");
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // Sync local state with store when opening
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalContextWindow(targetContextWindow.toString());
      setLocalIgnorePatterns(customIgnorePatterns);
      setLocalMaxFileSize(maxFileSizeKb.toString());
      setPatternsChanged(false);
    }
  }, [isSettingsOpen, targetContextWindow, customIgnorePatterns, maxFileSizeKb]);

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

  const handleMaxFileSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalMaxFileSize(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setMaxFileSizeKb(num);
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

  const handleAddTemplate = () => {
    if (newTemplateName.trim() && newTemplateText.trim()) {
      addTemplate(newTemplateName.trim(), newTemplateText.trim());
      setNewTemplateName("");
      setNewTemplateText("");
      setIsAddingTemplate(false);
    }
  };

  const handleSaveTemplateEdit = (template: PromptTemplate) => {
    updateTemplate(template.id, newTemplateName.trim() || template.name, newTemplateText);
    setEditingTemplate(null);
    setNewTemplateName("");
    setNewTemplateText("");
  };

  const startEditingTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template.id);
    setNewTemplateName(template.name);
    setNewTemplateText(template.text);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
    { id: "context", label: "Context", icon: <Gauge className="w-4 h-4" /> },
    { id: "ignore", label: "Ignore Rules", icon: <Filter className="w-4 h-4" /> },
    { id: "templates", label: "Templates", icon: <FileText className="w-4 h-4" /> },
    { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <Button variant="ghost" size="icon-sm" onClick={closeSettings}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-44 border-r border-[var(--border-color)] py-2 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-r-2 border-[var(--accent-color)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Theme Selection */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                    <Palette className="w-4 h-4 text-[var(--accent-color)]" />
                    Theme
                  </h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                    <div className="flex gap-2">
                      {(["light", "dark", "system"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                            theme === t
                              ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      "System" follows your OS preference automatically.
                    </p>
                  </div>
                </section>

                {/* Session Restore */}
                <section>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Startup Behavior</h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm text-[var(--text-primary)]">Restore previous session on startup</span>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Automatically reopen your last project and file selection
                        </p>
                      </div>
                      <button
                        onClick={() => setRestoreSessionOnStartup(!restoreSessionOnStartup)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          restoreSessionOnStartup ? "bg-[var(--accent-color)]" : "bg-[var(--bg-secondary)]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            restoreSessionOnStartup ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </section>

                {/* Data Management Section */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                    <FolderOpen className="w-4 h-4 text-[var(--accent-color)]" />
                    Data Management
                  </h3>
                  <div className="space-y-3">
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
              </div>
            )}

            {/* Context Tab */}
            {activeTab === "context" && (
              <div className="space-y-6">
                {/* Context Window Settings */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                    <Gauge className="w-4 h-4 text-[var(--accent-color)]" />
                    Target Context Window
                  </h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Token Limit
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
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
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

                {/* Max File Size */}
                <section>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Max File Size</h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Size Limit (KB)
                      </label>
                      <input
                        type="number"
                        value={localMaxFileSize}
                        onChange={handleMaxFileSizeChange}
                        min="64"
                        step="64"
                        className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Files larger than this will show a placeholder instead of contents
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[256, 512, 1024, 2048, 5120].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setLocalMaxFileSize(preset.toString());
                            setMaxFileSizeKb(preset);
                          }}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            maxFileSizeKb === preset
                              ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)]"
                          }`}
                        >
                          {preset >= 1024 ? `${preset / 1024}MB` : `${preset}KB`}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-500 flex items-center gap-1">
                      ⚠️ Large file sizes may impact performance and exceed AI context limits
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* Ignore Rules Tab */}
            {activeTab === "ignore" && (
              <div className="space-y-6">
                {/* Respect Ignore Files */}
                <section>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Respect Ignore Files</h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
                    {[
                      { key: "gitignore", label: ".gitignore", enabled: respectGitignore, toggle: setRespectGitignore },
                      { key: "aiignore", label: ".aiignore", enabled: respectAiignore, toggle: setRespectAiignore },
                      { key: "dockerignore", label: ".dockerignore", enabled: respectDockerignore, toggle: setRespectDockerignore },
                    ].map(({ key, label, enabled, toggle }) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-[var(--text-primary)]">{label}</span>
                        <button
                          onClick={() => toggle(!enabled)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            enabled ? "bg-[var(--accent-color)]" : "bg-[var(--bg-secondary)]"
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                    <p className="text-xs text-[var(--text-muted)] pt-2">
                      When enabled, files matching patterns in these files will be hidden from the tree
                    </p>
                  </div>
                </section>

                {/* Framework Presets */}
                <section>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Framework Presets</h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {FRAMEWORK_PRESETS.map((preset) => (
                        <label
                          key={preset.id}
                          className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={frameworkPresets.includes(preset.id)}
                            onChange={() => toggleFrameworkPreset(preset.id)}
                            className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                          />
                          <span className="text-sm text-[var(--text-primary)]">{preset.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-3">
                      Select frameworks to automatically ignore their build artifacts and dependencies
                    </p>
                  </div>
                </section>

                {/* Custom Ignore Patterns */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                    <Filter className="w-4 h-4 text-[var(--accent-color)]" />
                    Custom Patterns
                  </h3>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Patterns (one per line)
                      </label>
                      <textarea
                        value={localIgnorePatterns}
                        onChange={handleIgnorePatternsChange}
                        rows={6}
                        placeholder={"# Example patterns:\n*.log\n*.tmp\ntest_data\nsecrets.json"}
                        className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] font-mono resize-none"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
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
            )}

            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <FileText className="w-4 h-4 text-[var(--accent-color)]" />
                      Prompt Templates
                    </h3>
                    {!isAddingTemplate && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsAddingTemplate(true)}
                      >
                        <Plus className="w-4 h-4" />
                        Add Template
                      </Button>
                    )}
                  </div>

                  {/* Add Template Form */}
                  {isAddingTemplate && (
                    <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4 border-2 border-[var(--accent-color)]">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">New Template</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Template name..."
                          className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                        />
                        <textarea
                          value={newTemplateText}
                          onChange={(e) => setNewTemplateText(e.target.value)}
                          placeholder="Template prompt text..."
                          rows={4}
                          className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingTemplate(false);
                              setNewTemplateName("");
                              setNewTemplateText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleAddTemplate}
                            disabled={!newTemplateName.trim() || !newTemplateText.trim()}
                          >
                            <Check className="w-4 h-4" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Template List */}
                  <div className="space-y-2">
                    {promptTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-[var(--bg-tertiary)] rounded-lg p-4"
                      >
                        {editingTemplate === template.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              placeholder="Template name..."
                              className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                            />
                            <textarea
                              value={newTemplateText}
                              onChange={(e) => setNewTemplateText(e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] resize-none font-mono text-xs"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingTemplate(null);
                                  setNewTemplateName("");
                                  setNewTemplateText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSaveTemplateEdit(template)}
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {template.name}
                                  </span>
                                  {template.isDefault && (
                                    <span className="px-1.5 py-0.5 text-xs rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                                      Default
                                    </span>
                                  )}
                                </div>
                                {template.text && (
                                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                                    {template.text}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {template.id !== "none" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => startEditingTemplate(template)}
                                      title="Edit template"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    {!template.isDefault && (
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => {
                                          if (confirm(`Delete template "${template.name}"?`)) {
                                            deleteTemplate(template.id);
                                          }
                                        }}
                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                        title="Delete template"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <div className="space-y-6">
                <section>
                  <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[var(--accent-color)] flex items-center justify-center">
                        <span className="text-white font-bold text-xl">CC</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[var(--text-primary)]">Context Catcher</h4>
                        <p className="text-xs text-[var(--text-muted)]">Version 1.0.0</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Aggregate project files into AI-friendly markdown context. Built with Tauri 2.0 + React.
                    </p>
                    <a
                      href="https://github.com/sahilsuman933/context-catcher"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[var(--accent-color)] hover:underline"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] shrink-0">
          <p className="text-xs text-center text-[var(--text-muted)]">
            Made with ❤️ for AI-assisted development
          </p>
        </div>
      </div>
    </div>
  );
}
