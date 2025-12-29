import { 
  Trash2, 
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
  RotateCcw,
  Info,
  Keyboard,
  Code2,
} from "lucide-react";
import { useAppStore, FRAMEWORK_PRESETS, PromptTemplate } from "../store/appStore";
import { 
  Button, 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Checkbox,
  Input,
  Textarea,
  Separator,
} from "./ui";
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
    resetTemplatesToDefault,
    outputFormat,
    setOutputFormat,
  } = useAppStore();

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

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

  const handleRestoreDefaults = () => {
    if (confirm("This will remove all custom templates and reset defaults. Continue?")) {
      resetTemplatesToDefault();
    }
  };

  // Check if there are any custom templates
  const hasCustomTemplates = promptTemplates.some(t => !t.isDefault);

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-(--border-color) shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-44 border-r border-(--border-color) py-2 shrink-0">
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-0.5 p-0">
                {[
                  { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
                  { id: "context", label: "Context", icon: <Gauge className="w-4 h-4" /> },
                  { id: "ignore", label: "Ignore Rules", icon: <Filter className="w-4 h-4" /> },
                  { id: "templates", label: "Templates", icon: <FileText className="w-4 h-4" /> },
                  { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="w-full justify-start gap-2 px-4 py-2.5 rounded-none data-[state=active]:bg-(--accent-color)/10 data-[state=active]:text-(--accent-color) data-[state=active]:border-r-2 data-[state=active]:border-(--accent-color) data-[state=active]:shadow-none"
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-6">
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
              </TabsContent>

              {/* Context Tab */}
              <TabsContent value="context" className="mt-0 space-y-6">
                {/* Context Window Settings */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
                    <Gauge className="w-4 h-4 text-(--accent-color)" />
                    Target Context Window
                  </h3>
                  <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-(--text-primary) mb-1">
                        Token Limit
                      </label>
                      <Input
                        type="number"
                        value={localContextWindow}
                        onChange={handleContextWindowChange}
                        min="1000"
                        step="1000"
                      />
                      <p className="text-xs text-(--text-muted) mt-1">
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
                              ? "bg-(--accent-color) border-(--accent-color) text-white"
                              : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color)"
                          }`}
                        >
                          {(preset / 1000)}K
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Max File Size */}
                <section>
                  <h3 className="text-sm font-medium text-(--text-primary) mb-3">Max File Size</h3>
                  <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-(--text-primary) mb-1">
                        Size Limit (KB)
                      </label>
                      <Input
                        type="number"
                        value={localMaxFileSize}
                        onChange={handleMaxFileSizeChange}
                        min="64"
                        step="64"
                      />
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
                              ? "bg-(--accent-color) border-(--accent-color) text-white"
                              : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color)"
                          }`}
                        >
                          {preset >= 1024 ? `${preset / 1024}MB` : `${preset}KB`}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 bg-(--bg-secondary) rounded-md border border-(--border-color)">
                      <p className="text-xs text-(--text-secondary) leading-relaxed">
                        Files larger than this limit will be skipped. Lowering this value improves app performance 
                        and prevents very large files from "drowning out" relevant information in the AI's context 
                        (avoiding the "Lost in the Middle" effect).
                      </p>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Output Format */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
                    <Code2 className="w-4 h-4 text-(--accent-color)" />
                    Output Format
                  </h3>
                  <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
                    <div className="flex gap-2">
                      {([
                        { id: "markdown", name: "Markdown", desc: "Classic markdown with code blocks" },
                        { id: "xml", name: "XML", desc: "XML tags (better for Claude)" },
                      ] as const).map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setOutputFormat(format.id)}
                          className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${
                            outputFormat === format.id
                              ? "bg-(--accent-color) border-(--accent-color) text-white"
                              : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color) hover:text-(--text-primary)"
                          }`}
                        >
                          {format.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-(--text-muted)">
                      {outputFormat === "xml" 
                        ? "XML format wraps files in <file path=\"...\">...</file> tags. Claude and some LLMs perform better with structured XML context."
                        : "Markdown uses standard code blocks with language hints for syntax highlighting."
                      }
                    </p>
                  </div>
                </section>
              </TabsContent>

              {/* Ignore Rules Tab */}
              <TabsContent value="ignore" className="mt-0 space-y-6">
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
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-0 space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary)">
                      <FileText className="w-4 h-4 text-(--accent-color)" />
                      Prompt Templates
                    </h3>
                    <div className="flex gap-2">
                      {hasCustomTemplates && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRestoreDefaults}
                          title="Reset all templates to defaults"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore Defaults
                        </Button>
                      )}
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
                  </div>

                  {/* Add Template Form */}
                  {isAddingTemplate && (
                    <div className="bg-(--bg-tertiary) rounded-lg p-4 mb-4 border-2 border-(--accent-color)">
                      <h4 className="text-sm font-medium text-(--text-primary) mb-3">New Template</h4>
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Template name..."
                        />
                        <Textarea
                          value={newTemplateText}
                          onChange={(e) => setNewTemplateText(e.target.value)}
                          placeholder="Template prompt text..."
                          rows={4}
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
                        className="bg-(--bg-tertiary) rounded-lg p-4"
                      >
                        {editingTemplate === template.id ? (
                          <div className="space-y-3">
                            <Input
                              type="text"
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              placeholder="Template name..."
                            />
                            <Textarea
                              value={newTemplateText}
                              onChange={(e) => setNewTemplateText(e.target.value)}
                              rows={4}
                              className="font-mono text-xs"
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
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-(--text-primary)">
                                  {template.name}
                                </span>
                                {template.isDefault && (
                                  <span className="px-1.5 py-0.5 text-xs rounded bg-(--accent-color)/10 text-(--accent-color)">
                                    Default
                                  </span>
                                )}
                              </div>
                              {template.text && (
                                <p className="text-xs text-(--text-muted) mt-1 line-clamp-2">
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
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="mt-0 space-y-6">
                <section>
                  <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-(--accent-color) flex items-center justify-center">
                        <span className="text-white font-bold text-xl">CC</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-(--text-primary)">Context Catcher</h4>
                        <p className="text-xs text-(--text-muted)">Version 1.0.0</p>
                      </div>
                    </div>
                    <p className="text-sm text-(--text-secondary)">
                      Aggregate project files into AI-friendly markdown context. Built with Tauri 2.0 + React.
                    </p>
                    <a
                      href="https://github.com/sahilsuman933/context-catcher"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-(--accent-color) hover:underline"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
                  </div>
                </section>

                <Separator />

                {/* Keyboard Shortcuts */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
                    <Keyboard className="w-4 h-4 text-(--accent-color)" />
                    Keyboard Shortcuts
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
                      <span className="text-(--text-secondary)">Open Folder</span>
                      <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted)">
                        {cmdKey} O
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
                      <span className="text-(--text-secondary)">Settings</span>
                      <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted)">
                        {cmdKey} ,
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
                      <span className="text-(--text-secondary)">Copy Context</span>
                      <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted)">
                        {cmdKey} C
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
                      <span className="text-(--text-secondary)">Clear / Close</span>
                      <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted)">
                        {cmdKey} K
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2 col-span-2">
                      <span className="text-(--text-secondary)">Range Selection (File Tree)</span>
                      <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted)">
                        Shift + Click
                      </kbd>
                    </div>
                  </div>
                </section>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-(--border-color) shrink-0">
          <p className="text-xs text-center text-(--text-muted)">
            Made with ❤️ for AI-assisted development
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
