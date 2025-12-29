import { useState, useMemo } from "react";
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
  PanelLeftClose,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, FileNode } from "../store/appStore";
import { Badge, Button } from "./ui";

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

// Helper to count all files in a tree
function countFiles(node: FileNode): number {
  if (!node.is_dir) return 1;
  if (!node.children) return 0;
  return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

// FileTreeNode component for recursive rendering
interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
}

function FileTreeNode({ node, depth = 0 }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const { selectedPaths, togglePath, openFilePreview, getFileTokenPercentage, getFolderTokenPercentage } = useAppStore();

  const isSelected = selectedPaths.has(node.path);
  
  // Check if any children are selected (for partial selection indicator)
  const hasSelectedChildren = node.children?.some(
    (child) => selectedPaths.has(child.path) || 
    (child.children?.some(c => selectedPaths.has(c.path)))
  );
  
  const isPartiallySelected = !isSelected && hasSelectedChildren;

  // Get token percentage for files or folders
  const tokenPercentage = node.is_dir 
    ? (isSelected || isPartiallySelected ? getFolderTokenPercentage(node) : 0)
    : (isSelected ? getFileTokenPercentage(node.path) : 0);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePath(node.path, node);
  };

  const handleExpand = () => {
    if (node.is_dir) {
      setIsExpanded(!isExpanded);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.is_dir) {
      openFilePreview(node.path, node.name);
    }
  };

  // Get checkbox icon based on state
  const CheckboxIcon = isSelected 
    ? CheckSquare 
    : isPartiallySelected 
      ? MinusSquare 
      : Square;

  // Determine badge variant based on token percentage
  const getBadgeVariant = (pct: number) => {
    if (pct >= 30) return "destructive"; // Heavy file - red
    if (pct >= 15) return "warning";     // Medium file - yellow
    return "muted";                       // Light file - muted
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] cursor-pointer text-[var(--text-secondary)] text-sm group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className="flex-shrink-0 hover:text-[var(--accent-color)] transition-colors"
        >
          <CheckboxIcon
            className={`w-4 h-4 ${
              isSelected
                ? "text-[var(--accent-color)]"
                : isPartiallySelected
                ? "text-[var(--accent-color)] opacity-60"
                : "text-[var(--text-muted)]"
            }`}
          />
        </button>

        {/* Expand/collapse for directories */}
        {node.is_dir ? (
          <button
            onClick={handleExpand}
            className="flex-shrink-0 hover:text-[var(--text-primary)] transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-4" /> // Spacer for files
        )}

        {/* Icon */}
        {node.is_dir ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        )}

        {/* Name */}
        <span
          className="truncate flex-1"
          onClick={handleExpand}
          title={node.path}
        >
          {node.name}
        </span>

        {/* Token percentage badge for selected files */}
        {!node.is_dir && isSelected && tokenPercentage > 0 && (
          <Badge 
            variant={getBadgeVariant(tokenPercentage)} 
            className="ml-1 opacity-80"
            title={`This file contributes ${tokenPercentage}% of total tokens`}
          >
            {tokenPercentage}%
          </Badge>
        )}

        {/* Token percentage badge for folders with selected children */}
        {node.is_dir && (isSelected || isPartiallySelected) && tokenPercentage > 0 && (
          <Badge 
            variant={getBadgeVariant(tokenPercentage)} 
            className="ml-1 opacity-80"
            title={`This folder contributes ${tokenPercentage}% of total tokens`}
          >
            {tokenPercentage}%
          </Badge>
        )}

        {/* Eye icon for file preview - only for files */}
        {!node.is_dir && (
          <button
            onClick={handlePreview}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-[var(--accent-color)] transition-all ml-1"
            title="Preview file"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Children */}
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { fileTree, rootPath, isScanning, error, scanDirectory, selectedPaths, sidebarCollapsed, toggleSidebar, clearFileTree } =
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
    <aside className="w-72 min-w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <FolderTree className="w-5 h-5 text-[var(--accent-color)]" />
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
            <div className="flex items-center gap-2 p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <FolderOpen className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1" title={rootPath || ""}>
                {projectName}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseFolder}
                title="Close folder"
                className="text-[var(--text-muted)] hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
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
                  <RefreshCw className="w-4 h-4" />
                  <span>Change Folder</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Search Input - only show when folder is open */}
      {fileTree && (
        <div className="px-3 py-2 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection info */}
      {fileTree && selectedCount > 0 && (
        <div className="px-3 py-2 border-b border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-secondary)]">
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
            <Folder className="w-12 h-12 text-[var(--border-color)] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm">No folder selected</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Click "Open Folder" to get started
            </p>
          </div>
        )}

        {fileTree && filteredTree && <FileTreeNode node={filteredTree} />}
        
        {/* No search results */}
        {fileTree && searchQuery && !filteredTree && (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <Search className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-[var(--text-secondary)] text-sm">No files match "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
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
