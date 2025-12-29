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
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, FileNode } from "../store/appStore";

// FileTreeNode component for recursive rendering
interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
}

function FileTreeNode({ node, depth = 0 }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const { selectedPaths, togglePath } = useAppStore();

  const isSelected = selectedPaths.has(node.path);
  
  // Check if any children are selected (for partial selection indicator)
  const hasSelectedChildren = node.children?.some(
    (child) => selectedPaths.has(child.path) || 
    (child.children?.some(c => selectedPaths.has(c.path)))
  );
  
  const isPartiallySelected = !isSelected && hasSelectedChildren;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePath(node.path, node);
  };

  const handleExpand = () => {
    if (node.is_dir) {
      setIsExpanded(!isExpanded);
    }
  };

  // Get checkbox icon based on state
  const CheckboxIcon = isSelected 
    ? CheckSquare 
    : isPartiallySelected 
      ? MinusSquare 
      : Square;

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
  const { fileTree, rootPath, isScanning, error, scanDirectory, selectedPaths } =
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

  return (
    <aside className="w-72 min-w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-screen">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <FolderTree className="w-5 h-5 text-[var(--accent-color)]" />
            <span className="font-semibold text-sm">File Tree</span>
          </div>
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
