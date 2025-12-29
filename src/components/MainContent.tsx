import { FileText, Copy, Download } from "lucide-react";

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[#2a2a36] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#3b82f6]" />
          <h1 className="text-lg font-semibold text-[#e4e4e7]">Output Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1a24] hover:bg-[#2a2a36] text-[#a1a1aa] text-sm transition-colors">
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#12121a] rounded-lg border border-[#2a2a36] p-6">
            <h2 className="text-2xl font-bold text-[#e4e4e7] mb-4">Hello World</h2>
            <p className="text-[#a1a1aa] leading-relaxed">
              Welcome to <span className="text-[#3b82f6] font-medium">Context Catcher</span>! 
              This is your main content area where the output preview will be displayed.
            </p>
            <div className="mt-6 p-4 bg-[#0a0a0f] rounded border border-[#2a2a36]">
              <p className="text-sm text-[#a1a1aa] font-mono">
                // Your generated context will appear here...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="px-6 py-2 border-t border-[#2a2a36] flex items-center justify-between text-xs text-[#a1a1aa]">
        <span>Ready</span>
        <span>0 tokens</span>
      </footer>
    </main>
  );
}
