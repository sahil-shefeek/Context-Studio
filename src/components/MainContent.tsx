import { FileText, Copy, Download, FolderOpen, Loader2, Check, Sun, Moon, Shield, ShieldCheck, PanelLeft, Clock, X, ChevronDown } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useState, useCallback, useMemo } from "react";
import { Button, Select, Badge } from "./ui";
import { CodeMirrorEditor } from "./CodeMirrorEditor";

export function MainContent() {
  const { 
    fileTree, 
    generatedOutput, 
    tokenCount, 
    isGenerating, 
    theme, 
    toggleTheme, 
    setGeneratedOutput,
    isPrivacyFilterEnabled,
    togglePrivacyFilter,
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
  } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(true);

  const hasOutput = generatedOutput.length > 0;
  const hasProject = !!fileTree;

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
              onClick={togglePrivacyFilter}
              className={isPrivacyFilterEnabled ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}
              title={isPrivacyFilterEnabled ? "Privacy filter enabled - secrets are masked" : "Enable privacy filter to mask secrets"}
            >
              {isPrivacyFilterEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
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
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in duration-300">
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-[var(--accent-color)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Welcome to Context Catcher</h2>
              <p className="text-[var(--text-secondary)] max-w-md mb-8">
                Open a folder to scan your project files and generate AI-friendly context.
              </p>
              
              {/* Recent Folders */}
              {displayRecentFolders.length > 0 && (
                <div className="w-full max-w-md">
                  <div className="flex items-center gap-2 mb-3 text-[var(--text-muted)]">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Recent Folders</span>
                  </div>
                  <div className="space-y-2">
                    {displayRecentFolders.map((folder) => (
                      <div
                        key={folder.path}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-colors text-left group"
                      >
                        <button
                          onClick={() => openRecentFolder(folder.path)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <FolderOpen className="w-5 h-5 text-[var(--accent-color)] flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-left">
                            <span className="block text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-color)]">
                              {folder.name}
                            </span>
                            <span className="block text-xs text-[var(--text-muted)] truncate">
                              {folder.path}
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentFolder(folder.path);
                          }}
                          className="p-1.5 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
              <FileText className="w-16 h-16 text-[var(--border-color)] mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Select Files</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Use the checkboxes in the file tree to select the files you want to include.
                Click on folders to select all files within them.
              </p>
            </div>
          ) : (
            // Show generated output - CodeMirror editor with optional template accordion
            <div className="h-full flex flex-col animate-in fade-in duration-300 gap-3">
              {/* Accordion: Active Prompt Template */}
              {hasActiveTemplate && (
                <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden flex-shrink-0">
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
                  theme={theme}
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
