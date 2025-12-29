import { FileText, Copy, Download, FolderOpen } from "lucide-react";
import { useAppStore } from "../store/appStore";

export function MainContent() {
  const { selectedPaths, fileTree, rootPath } = useAppStore();
  
  // Count only files (not directories) in selected paths
  const selectedFiles = Array.from(selectedPaths).filter(p => {
    // Simple heuristic: if it has an extension, it's likely a file
    const lastPart = p.split('/').pop() || '';
    return lastPart.includes('.');
  });
  
  const hasSelection = selectedFiles.length > 0;

  return (
    <main className="flex-1 flex flex-col h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2a2a36] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#3b82f6]" />
          <h1 className="text-lg font-semibold text-[#e4e4e7]">Output Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={!hasSelection}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1a24] hover:bg-[#2a2a36] disabled:opacity-50 disabled:cursor-not-allowed text-[#a1a1aa] text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          <button 
            disabled={!hasSelection}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {!fileTree ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <FolderOpen className="w-16 h-16 text-[#2a2a36] mb-4" />
              <h2 className="text-xl font-semibold text-[#e4e4e7] mb-2">Welcome to Context Catcher</h2>
              <p className="text-[#a1a1aa] max-w-md">
                Open a folder using the sidebar to scan your project files. 
                Then select the files you want to include in your context.
              </p>
            </div>
          ) : !hasSelection ? (
            // Folder loaded but no selection
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <FileText className="w-16 h-16 text-[#2a2a36] mb-4" />
              <h2 className="text-xl font-semibold text-[#e4e4e7] mb-2">Select Files</h2>
              <p className="text-[#a1a1aa] max-w-md">
                Use the checkboxes in the file tree to select the files you want to include.
                Click on folders to select all files within them.
              </p>
            </div>
          ) : (
            // Show selected files preview
            <div className="bg-[#12121a] rounded-lg border border-[#2a2a36] p-6">
              <h2 className="text-lg font-semibold text-[#e4e4e7] mb-4">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedFiles.slice(0, 50).map((path) => (
                  <div 
                    key={path}
                    className="text-sm text-[#a1a1aa] font-mono bg-[#0a0a0f] px-3 py-2 rounded border border-[#2a2a36] truncate"
                    title={path}
                  >
                    {path.replace(rootPath || '', '').replace(/^\//, '')}
                  </div>
                ))}
                {selectedFiles.length > 50 && (
                  <p className="text-xs text-[#6b7280] mt-2">
                    ...and {selectedFiles.length - 50} more files
                  </p>
                )}
              </div>
              <div className="mt-6 p-4 bg-[#0a0a0f] rounded border border-[#2a2a36]">
                <p className="text-sm text-[#6b7280] font-mono">
                  // Content generation will be implemented next...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="px-6 py-2 border-t border-[#2a2a36] flex items-center justify-between text-xs text-[#a1a1aa]">
        <span>{hasSelection ? `${selectedFiles.length} files selected` : 'Ready'}</span>
        <span>0 tokens</span>
      </footer>
    </main>
  );
}
