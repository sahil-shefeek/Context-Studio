
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
} from "lucide-react";
import { useAppStore, FileNode } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "./ui";

interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function FileTreeNode({ node, depth = 0, isExpanded = false, onToggleExpand }: FileTreeNodeProps) {
  const { selectedPaths, togglePathRange, openFilePreview, getFileTokenPercentage, getFolderTokenPercentage } = useAppStore(
    useShallow((s) => ({
      selectedPaths: s.selectedPaths,
      togglePathRange: s.togglePathRange,
      openFilePreview: s.openFilePreview,
      getFileTokenPercentage: s.getFileTokenPercentage,
      getFolderTokenPercentage: s.getFolderTokenPercentage,
    }))
  );

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
    // Support Shift+Click for range selection
    togglePathRange(node.path, node, e.shiftKey);
  };

  const handleExpand = () => {
    if (node.is_dir && onToggleExpand) {
      onToggleExpand();
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
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-(--bg-tertiary) cursor-pointer text-(--text-secondary) text-sm group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className="shrink-0 hover:text-(--accent-color) transition-colors"
        >
          <CheckboxIcon
            className={`w-4 h-4 ${
              isSelected
                ? "text-(--accent-color)"
                : isPartiallySelected
                ? "text-(--accent-color) opacity-60"
                : "text-(--text-muted)"
            }`}
          />
        </button>

        {/* Expand/collapse for directories */}
        {node.is_dir ? (
          <button
            onClick={handleExpand}
            className="shrink-0 hover:text-(--text-primary) transition-colors"
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
            <FolderOpen className="w-4 h-4 text-(--accent-color) shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-(--accent-color) shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-(--text-muted) shrink-0" />
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
            className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-(--accent-color) transition-all ml-1"
            title="Preview file"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
