import { FileText, Copy, Download, FolderOpen, Loader2, Check } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useState } from "react";

export function MainContent() {
  const { fileTree, generatedOutput, tokenCount, isGenerating } = useAppStore();
  const [copied, setCopied] = useState(false);

  const hasOutput = generatedOutput.length > 0;

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

  // Format token count with commas
  const formatTokens = (count: number) => {
    return count.toLocaleString();
  };

  return (
    <main className="flex-1 flex flex-col h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[var(--accent-color)]" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Output Preview</h1>
          {isGenerating && (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            disabled={!hasOutput}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-secondary)] text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={!hasOutput}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="h-full">
          {!fileTree ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <FolderOpen className="w-16 h-16 text-[var(--border-color)] mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Welcome to Context Catcher</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Open a folder using the sidebar to scan your project files. 
                Then select the files you want to include in your context.
              </p>
            </div>
          ) : !hasOutput ? (
            // Folder loaded but no selection
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <FileText className="w-16 h-16 text-[var(--border-color)] mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Select Files</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Use the checkboxes in the file tree to select the files you want to include.
                Click on folders to select all files within them.
              </p>
            </div>
          ) : (
            // Show generated output
            <div className="h-full flex flex-col">
              <div className="flex-1 bg-[var(--code-bg)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                <pre className="code-output h-full overflow-auto p-4 text-[var(--text-primary)] m-0">
                  {generatedOutput}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="px-6 py-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{hasOutput ? "Context generated" : "Ready"}</span>
        <div className="flex items-center gap-4">
          <span>{generatedOutput.length.toLocaleString()} chars</span>
          <span className="px-2 py-0.5 rounded bg-[var(--accent-color)] text-white font-medium">
            {formatTokens(tokenCount)} tokens
          </span>
        </div>
      </footer>
    </main>
  );
}
