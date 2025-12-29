import { FolderTree, ChevronRight, File, Folder } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 min-w-64 bg-[#12121a] border-r border-[#2a2a36] flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a36]">
        <div className="flex items-center gap-2 text-[#e4e4e7]">
          <FolderTree className="w-5 h-5 text-[#3b82f6]" />
          <span className="font-semibold text-sm">File Tree</span>
        </div>
      </div>

      {/* File Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {/* Example folder structure */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[#1a1a24] cursor-pointer text-[#a1a1aa] text-sm">
            <ChevronRight className="w-4 h-4" />
            <Folder className="w-4 h-4 text-[#3b82f6]" />
            <span>src</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[#1a1a24] cursor-pointer text-[#a1a1aa] text-sm ml-4">
            <File className="w-4 h-4 text-[#a1a1aa]" />
            <span>main.tsx</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[#1a1a24] cursor-pointer text-[#a1a1aa] text-sm ml-4">
            <File className="w-4 h-4 text-[#a1a1aa]" />
            <span>App.tsx</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#2a2a36] text-xs text-[#a1a1aa]">
        <span>Drag & drop files here</span>
      </div>
    </aside>
  );
}
