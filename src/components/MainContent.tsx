import { FileText, Copy, Download, FolderOpen, Loader2, Check, Shield, ShieldCheck, PanelLeft, Clock, X, ChevronDown, AlertTriangle, Settings } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useState, useCallback, useMemo } from "react";
import { Button, Select, Badge } from "./ui";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { open } from "@tauri-apps/plugin-dialog";

export function MainContent() {
  const { 
    fileTree, 
    generatedOutput, 
    tokenCount, 
    isGenerating, 
    resolvedTheme,
    setGeneratedOutput,
    isPrivacyFilterEnabled,
    setPrivacyFilterEnabled,
    sidebarCollapsed,
    toggleSidebar,
    recentFolders,
    openRecentFolder,
    removeRecentFolder,
    promptTemplates,
    selectedTemplateId,
    setSelectedTemplate,
    getOutputWithTemplate,
    getContextPercentage,
    getContextStatus,
    targetContextWindow,
    openSettings,
    scanDirectory,
  } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(true);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const hasOutput = generatedOutput.length > 0;
  const hasProject = !!fileTree;

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

  // Get selected template
  const selectedTemplate = promptTemplates.find(t => t.id === selectedTemplateId);
  const hasActiveTemplate = selectedTemplate && selectedTemplate.id !== "none" && selectedTemplate.text;

  // Convert templates to select options
  const templateOptions = promptTemplates.map(t => ({
    value: t.id,
    label: t.name,
  }));

  // Context percentage and status
  const contextPercentage = getContextPercentage();
  const contextStatus = getContextStatus();

  // Get simple status message
  const getStatusMessage = () => {
    if (!hasProject) return "Ready";
    if (hasOutput) return "Context Generated";
    return "Ready";
  };

  // Handle privacy filter toggle with confirmation
  const handlePrivacyToggle = () => {
    if (isPrivacyFilterEnabled) {
      // Show warning when trying to disable
      setShowPrivacyWarning(true);
    } else {
      // Enable directly (safe action)
      setPrivacyFilterEnabled(true);
    }
  };

  const confirmDisablePrivacy = () => {
    setPrivacyFilterEnabled(false);
    setShowPrivacyWarning(false);
  };

  const handleCopy = async () => {
    // Use output with template prepended
    const outputWithTemplate = getOutputWithTemplate();
    if (!outputWithTemplate) return;
    try {
      await navigator.clipboard.writeText(outputWithTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = () => {
    // Use output with template prepended
    const outputWithTemplate = getOutputWithTemplate();
    if (!outputWithTemplate) return;
    const blob = new Blob([outputWithTemplate], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "context.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle manual text edits - updates counts automatically
  const handleOutputChange = useCallback((value: string) => {
    setGeneratedOutput(value);
  }, [setGeneratedOutput]);

  // Format token count with commas
  const formatTokens = (count: number) => {
    return count.toLocaleString();
  };

  // Header title based on project state
  const headerTitle = hasProject ? "Output Preview" : "Context Catcher";

  return (
    <main className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] relative">
      {/* Privacy Warning Modal */}
      {showPrivacyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Disable Privacy Filter?</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <strong className="text-yellow-500">Warning:</strong> Disabling the privacy filter may expose sensitive information like API keys, passwords, or environment variables in your context output.
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Only disable this if you're sure your selected files don't contain secrets, or if you need to include them intentionally.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowPrivacyWarning(false)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={confirmDisablePrivacy}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Disable Filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Show expand button when sidebar is collapsed */}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
          <FileText className="w-5 h-5 text-[var(--accent-color)]" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Prompt Template dropdown - only show when project is open */}
          {hasProject && (
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplate}
              options={templateOptions}
              placeholder="Select template..."
              className="w-40"
            />
          )}

          {/* Privacy Filter toggle - only show when project is open */}
          {hasProject && (
            <Button
              variant={isPrivacyFilterEnabled ? "default" : "secondary"}
              size="icon-sm"
              onClick={handlePrivacyToggle}
              className={isPrivacyFilterEnabled ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}
              title={isPrivacyFilterEnabled ? "Privacy filter enabled - secrets are masked" : "Enable privacy filter to mask secrets"}
            >
              {isPrivacyFilterEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </Button>
          )}
          
          {/* Only show action buttons when project is open */}
          {hasProject && (
            <>
              <div className="w-px h-6 bg-[var(--border-color)]" />
              
              <Button 
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                disabled={!hasOutput}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={!hasOutput}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-color)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Generating context...</span>
            </div>
          </div>
        )}

        <div className="h-full transition-all duration-300 ease-in-out">
          {!fileTree ? (
            // Empty state - Welcome screen
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in duration-300 overflow-y-auto py-8">
              <div className="w-20 h-20 rounded-2xl bg-(--accent-color)/10 flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-(--accent-color)" />
              </div>
              <h2 className="text-2xl font-semibold text-(--text-primary) mb-2">Welcome to Context Catcher</h2>
              <p className="text-(--text-secondary) max-w-md mb-8">
                Open a folder to scan your project files and generate AI-friendly context.
              </p>
              
              {/* Quick Start Section */}
              <div className="w-full max-w-2xl mb-8">
                <h3 className="text-sm font-medium text-(--text-muted) uppercase tracking-wider mb-4">Quick Start</h3>
                <div className="grid grid-cols-2 gap-4">
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
                    onClick={openSettings}
                    className="flex items-center gap-4 p-4 rounded-xl bg-(--bg-secondary) hover:bg-(--bg-tertiary) border border-(--border-color) hover:border-(--accent-color) transition-all text-left group"
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
          ) : !hasOutput ? (
            // Folder loaded but no selection
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in duration-300">
              <FileText className="w-16 h-16 text-(--border-color) mb-4" />
              <h2 className="text-xl font-semibold text-(--text-primary) mb-2">Select Files</h2>
              <p className="text-(--text-secondary) max-w-md mb-4">
                Use the checkboxes in the file tree to select the files you want to include.
                Click on folders to select all files within them.
              </p>
              <p className="text-xs text-(--text-muted)">
                <kbd className="px-1.5 py-0.5 rounded bg-(--bg-tertiary) mr-1">Shift</kbd>
                + Click for range selection
              </p>
            </div>
          ) : (
            // Show generated output - CodeMirror editor with optional template accordion
            <div className="h-full flex flex-col animate-in fade-in duration-300 gap-3">
              {/* Accordion: Active Prompt Template */}
              {hasActiveTemplate && (
                <div className="bg-(--bg-secondary) rounded-lg border border-(--border-color) overflow-hidden shrink-0">
                  <button
                    onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      System Prompt Template
                    </span>
                    <ChevronDown 
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isTemplateExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isTemplateExpanded && (
                    <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {selectedTemplate?.text}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CodeMirror Editor */}
              <div className="flex-1 bg-[var(--code-bg)] rounded-lg border border-[var(--border-color)] overflow-hidden min-h-0">
                <CodeMirrorEditor
                  value={generatedOutput}
                  onChange={handleOutputChange}
                  theme={resolvedTheme}
                  placeholder="Generated context will appear here..."
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] text-center flex-shrink-0">
                💡 You can edit this text before copying. Character and token counts update automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="px-6 py-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">{getStatusMessage()}</span>
        {hasProject && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{generatedOutput.length.toLocaleString()} chars</Badge>
            
            {/* Token count with progress indicator */}
            <div className="flex items-center gap-2">
              <div className="relative w-24 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                    contextStatus === 'red' 
                      ? 'bg-red-500' 
                      : contextStatus === 'yellow' 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, contextPercentage)}%` }}
                />
              </div>
              <Badge 
                variant="default"
                className={
                  contextStatus === 'red' 
                    ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                    : contextStatus === 'yellow' 
                      ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' 
                      : ''
                }
                title={`${contextPercentage}% of ${targetContextWindow.toLocaleString()} token limit`}
              >
                {formatTokens(tokenCount)} tokens ({contextPercentage}%)
              </Badge>
            </div>
          </div>
        )}
      </footer>
    </main>
  );
}
