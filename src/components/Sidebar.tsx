import { useState } from "react";
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
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, FileNode } from "../store/appStore";
import { Badge } from "./ui";

// FileTreeNode component for recursive rendering
interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
}

function FileTreeNode({ node, depth = 0 }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const { selectedPaths, togglePath, openFilePreview, getFileTokenPercentage } = useAppStore();

  const isSelected = selectedPaths.has(node.path);
  
  // Check if any children are selected (for partial selection indicator)
  const hasSelectedChildren = node.children?.some(
    (child) => selectedPaths.has(child.path) || 
    (child.children?.some(c => selectedPaths.has(c.path)))
  );
  
  const isPartiallySelected = !isSelected && hasSelectedChildren;

  // Get token percentage for files
  const tokenPercentage = !node.is_dir && isSelected ? getFileTokenPercentage(node.path) : 0;

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
  const { fileTree, rootPath, isScanning, error, scanDirectory, selectedPaths, sidebarCollapsed, toggleSidebar } =
    useAppStore();

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

  const selectedCount = selectedPaths.size;

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
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Open Folder Button */}
        <button
          onClick={handleOpenFolder}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
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
        </button>
      </div>

      {/* Selection info */}
      {fileTree && (
        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center">
          <span className="text-xs text-[var(--text-secondary)]">
            {selectedCount} selected
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

        {fileTree && <FileTreeNode node={fileTree} />}
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
