import { FileText, Copy, Download, FolderOpen, Loader2, Check, Sun, Moon, Shield, ShieldCheck, PanelLeft, Clock, Pencil, Sparkles } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useState, useCallback, useEffect } from "react";
import { Button } from "./ui";
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
  } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [wasGenerated, setWasGenerated] = useState(false);

  const hasOutput = generatedOutput.length > 0;
  const hasProject = !!fileTree;

  // Track when content is generated vs edited
  useEffect(() => {
    if (isGenerating) {
      setWasGenerated(true);
      setIsEditing(false);
    }
  }, [isGenerating]);

  // Get dynamic status message
  const getStatusMessage = () => {
    if (!hasProject) return "Ready to explore";
    if (isGenerating) return "Generating...";
    if (isEditing) return "Editing...";
    if (hasOutput && wasGenerated) return "Context ready";
    if (hasOutput) return "Modified";
    return "Select files to begin";
  };

  const handleCopy = async () => {
    if (!generatedOutput) return;
    try {
      await navigator.clipboard.writeText(generatedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = () => {
    if (!generatedOutput) return;
    const blob = new Blob([generatedOutput], { type: "text/markdown" });
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
    setIsEditing(true);
    setWasGenerated(false);
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
          {isGenerating && (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
          )}
        </div>
        <div className="flex items-center gap-2">
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
              {recentFolders.length > 0 && (
                <div className="w-full max-w-md">
                  <div className="flex items-center gap-2 mb-3 text-[var(--text-muted)]">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Recent Folders</span>
                  </div>
                  <div className="space-y-2">
                    {recentFolders.map((folder) => (
                      <button
                        key={folder.path}
                        onClick={() => openRecentFolder(folder.path)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-colors text-left group"
                      >
                        <FolderOpen className="w-5 h-5 text-[var(--accent-color)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-color)]">
                            {folder.name}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)] truncate">
                            {folder.path}
                          </span>
                        </div>
                      </button>
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
            // Show generated output - CodeMirror editor
            <div className="h-full flex flex-col animate-in fade-in duration-300">
              <div className="flex-1 bg-[var(--code-bg)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                <CodeMirrorEditor
                  value={generatedOutput}
                  onChange={handleOutputChange}
                  theme={theme}
                  placeholder="Generated context will appear here..."
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                💡 You can edit this text before copying. Character and token counts update automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="px-6 py-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
          {isEditing && !isGenerating && <Pencil className="w-3 h-3" />}
          {hasOutput && wasGenerated && !isEditing && !isGenerating && <Sparkles className="w-3 h-3 text-[var(--accent-color)]" />}
          <span>{getStatusMessage()}</span>
        </div>
        {hasProject && (
          <div className="flex items-center gap-4">
            <span>{generatedOutput.length.toLocaleString()} chars</span>
            <span className="px-2 py-0.5 rounded bg-[var(--accent-color)] text-white font-medium">
              {formatTokens(tokenCount)} tokens
            </span>
          </div>
        )}
      </footer>
    </main>
  );
}
