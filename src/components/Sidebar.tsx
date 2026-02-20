import { useState, useMemo } from "react";
import {
  FolderTree,
  Loader2,
  Folder,
  FolderOpen,
  PanelLeftClose,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, FileNode } from "../store/appStore";
import { Button } from "./ui";
import { FileTreeNode } from "./FileTreeNode";
import { SearchInput } from "./SearchInput";

// Helper to filter tree based on search query
function filterTree(node: FileNode, query: string): FileNode | null {
  const lowerQuery = query.toLowerCase();
  const nameMatches = node.name.toLowerCase().includes(lowerQuery);
  
  if (node.is_dir && node.children) {
    // Filter children recursively
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter((child): child is FileNode => child !== null);
    
    // If any children match, include this folder (even if name doesn't match)
    if (filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    
    // If folder name matches but no children match, still show it (with its original children)
    if (nameMatches) {
      return node;
    }
    
    return null;
  }
  
  // For files, only include if name matches
  return nameMatches ? node : null;
}

export function Sidebar() {
  const { fileTree, rootPath, isScanning, error, scanDirectory, selectedPaths, sidebarCollapsed, toggleSidebar, clearFileTree, refreshDirectory } =
    useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!fileTree || !searchQuery.trim()) return fileTree;
    return filterTree(fileTree, searchQuery.trim());
  }, [fileTree, searchQuery]);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select a folder to scan",
      });

      if (selected && typeof selected === "string") {
        await scanDirectory(selected);
        setSearchQuery(""); // Clear search on new folder
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const handleCloseFolder = () => {
    clearFileTree();
    setSearchQuery("");
  };

  const selectedCount = selectedPaths.size;
  const projectName = rootPath ? rootPath.split('/').pop() || rootPath : null;

  // When collapsed, hide sidebar entirely (expand button moved to MainContent header)
  if (sidebarCollapsed) {
    return null;
  }

  return (
    <aside className="w-72 min-w-72 bg-(--bg-secondary) border-r border-(--border-color) flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-(--border-color)">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-(--text-primary)">
            <FolderTree className="w-5 h-5 text-(--accent-color)" />
            <span className="font-semibold text-sm">File Tree</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        {/* Contextual buttons based on project state */}
        {!fileTree ? (
          // No folder open - show large Open Folder button
          <Button
            variant="default"
            className="w-full"
            onClick={handleOpenFolder}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4" />
                <span>Open Folder</span>
              </>
            )}
          </Button>
        ) : (
          // Folder is open - show project name with Close and Change buttons
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded bg-(--bg-tertiary) border border-(--border-color)">
              <FolderOpen className="w-4 h-4 text-(--accent-color) shrink-0" />
              <span className="text-sm font-medium text-(--text-primary) truncate flex-1" title={rootPath || ""}>
                {projectName}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseFolder}
                title="Close folder"
                className="text-(--text-muted) hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleOpenFolder}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span>Change</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => refreshDirectory()}
                disabled={isScanning}
                title="Refresh file tree"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search Input - only show when folder is open */}
      {fileTree && (
        <div className="px-3 py-2 border-b border-(--border-color)">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files..."
          />
        </div>
      )}

      {/* Selection info */}
      {fileTree && selectedCount > 0 && (
        <div className="px-3 py-2 border-b border-(--border-color)">
          <span className="text-xs text-(--text-secondary)">
            {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {/* File Tree Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3 m-2 rounded bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {!fileTree && !isScanning && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Folder className="w-12 h-12 text-(--border-color) mb-3" />
            <p className="text-(--text-secondary) text-sm">No folder selected</p>
            <p className="text-(--text-muted) text-xs mt-1">
              Click "Open Folder" to get started
            </p>
          </div>
        )}

        {fileTree && filteredTree && <FileTreeNode node={filteredTree} />}
        
        {/* No search results */}
        {fileTree && searchQuery && !filteredTree && (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <Search className="w-8 h-8 text-(--text-muted) mb-2" />
            <p className="text-(--text-secondary) text-sm">No files match "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-(--border-color) text-xs text-(--text-secondary)">
        {rootPath ? (
          <span className="truncate block" title={rootPath}>
            {rootPath}
          </span>
        ) : (
          <span>Select a folder to scan</span>
        )}
      </div>
    </aside>
  );
}
