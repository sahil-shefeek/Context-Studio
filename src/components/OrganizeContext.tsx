import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, FileText, Sparkles, Brain } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "./ui";

interface SortableFileItemProps {
  id: string;
  path: string;
  index: number;
  tokenCount: number;
  totalTokens: number;
  rootPath: string | null;
  startToken: number;
  endToken: number;
}

function SortableFileItem({ 
  id, 
  path, 
  index, 
  tokenCount, 
  totalTokens,
  rootPath,
  startToken,
  endToken
}: SortableFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate percentage
  const percentage = totalTokens > 0 ? Math.round((tokenCount / totalTokens) * 100) : 0;
  
  // Calculate if in attention zone (first 10% or last 10% of TOKENS)
  const primacyTokenThreshold = totalTokens * 0.1;
  const recencyTokenThreshold = totalTokens * 0.9;
  
  const isInPrimacyZone = startToken <= primacyTokenThreshold;
  const isInRecencyZone = endToken >= recencyTokenThreshold;
  const isInAttentionZone = isInPrimacyZone || isInRecencyZone;

  // Get relative path for display
  const relativePath = rootPath ? path.replace(rootPath, "").replace(/^\//, "") : path;
  const fileName = path.split("/").pop() || path;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all
        ${isDragging 
          ? "opacity-50 bg-(--accent-color)/10 border-(--accent-color)" 
          : "bg-(--bg-secondary) border-(--border-color) hover:border-(--accent-color)/50"
        }
        ${isInAttentionZone ? "ring-1 ring-inset" : ""}
        ${isInPrimacyZone ? "ring-green-500/40" : ""}
        ${isInRecencyZone ? "ring-blue-500/40" : ""}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 rounded hover:bg-(--bg-tertiary) cursor-grab active:cursor-grabbing text-(--text-muted) hover:text-(--text-secondary) flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Position indicator */}
      <span className="text-xs font-mono text-(--text-muted) w-6 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* File icon */}
      <FileText className="w-4 h-4 text-(--text-muted) flex-shrink-0" />

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--text-primary) truncate">
            {fileName}
          </span>
          {isInPrimacyZone && (
            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px] px-1.5 py-0">
              <Sparkles className="w-3 h-3 mr-0.5" />
              Primacy
            </Badge>
          )}
          {isInRecencyZone && (
            <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-[10px] px-1.5 py-0">
              <Brain className="w-3 h-3 mr-0.5" />
              Recency
            </Badge>
          )}
        </div>
        <span className="text-xs text-(--text-muted) truncate block">
          {relativePath}
        </span>
      </div>

      {/* Token info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <div className="text-xs font-medium text-(--text-secondary)">
            {tokenCount.toLocaleString()} tokens
          </div>
          <div className="text-[10px] text-(--text-muted)">
            {percentage}% of total
          </div>
        </div>
        {/* Token percentage bar */}
        <div className="w-12 h-6 bg-(--bg-tertiary) rounded overflow-hidden flex items-end">
          <div 
            className={`w-full transition-all duration-300 rounded-t ${
              isInAttentionZone 
                ? isInPrimacyZone 
                  ? "bg-green-500/60" 
                  : "bg-blue-500/60"
                : "bg-(--accent-color)/40"
            }`}
            style={{ height: `${Math.max(4, Math.min(100, percentage * 2))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function OrganizeContext() {
  const { 
    getOrderedSelectedFiles, 
    reorderSelection, 
    fileTokenMap, 
    tokenCount,
    rootPath 
  } = useAppStore(useShallow((s) => ({
    getOrderedSelectedFiles: s.getOrderedSelectedFiles,
    reorderSelection: s.reorderSelection,
    fileTokenMap: s.fileTokenMap,
    tokenCount: s.tokenCount,
    rootPath: s.rootPath,
  })));

  const orderedFiles = getOrderedSelectedFiles();
  const totalFiles = orderedFiles.length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedFiles.indexOf(active.id as string);
      const newIndex = orderedFiles.indexOf(over.id as string);
      const newOrder = arrayMove(orderedFiles, oldIndex, newIndex);
      reorderSelection(newOrder);
    }
  };

  // Memoize the list items to avoid unnecessary re-renders
  const listItems = useMemo(() => {
    let currentTokenSum = 0;
    return orderedFiles.map((path, index) => {
      const fileTokens = fileTokenMap.get(path) || 0;
      const startToken = currentTokenSum;
      const endToken = currentTokenSum + fileTokens;
      currentTokenSum += fileTokens;
      return {
        id: path,
        path,
        index,
        tokenCount: fileTokens,
        startToken,
        endToken,
      };
    });
  }, [orderedFiles, fileTokenMap]);

  // Calculate attention zone stats
  const primacyTokenThreshold = tokenCount * 0.1;
  const recencyTokenThreshold = tokenCount * 0.9;
  const primacyCount = listItems.filter(item => item.startToken <= primacyTokenThreshold).length || 1;
  const recencyCount = listItems.filter(item => item.endToken >= recencyTokenThreshold).length || 1;

  if (orderedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="w-12 h-12 text-(--border-color) mb-4" />
        <h3 className="text-lg font-semibold text-(--text-primary) mb-2">
          No Files Selected
        </h3>
        <p className="text-sm text-(--text-secondary) max-w-sm">
          Select files from the sidebar to organize their order in the generated context.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header explanation */}
      <div className="px-4 py-3 bg-(--bg-secondary) border-b border-(--border-color) rounded-t-lg">
        <h3 className="text-sm font-semibold text-(--text-primary) mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-(--accent-color)" />
          Optimize for AI Attention
        </h3>
        <p className="text-xs text-(--text-secondary)">
          Drag files to reorder. LLMs pay more attention to content at the <span className="text-green-500 font-medium">beginning</span> (primacy) 
          and <span className="text-blue-500 font-medium">end</span> (recency) of the context window.
        </p>
      </div>

      {/* Attention zone indicators */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-(--text-muted) border-b border-(--border-color)">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Primacy Zone ({primacyCount} file{primacyCount !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Recency Zone ({recencyCount} file{recencyCount !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex-1" />
        <span>{totalFiles} files • {tokenCount.toLocaleString()} tokens</span>
      </div>

      {/* Sortable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedFiles}
            strategy={verticalListSortingStrategy}
          >
            {listItems.map((item) => (
              <SortableFileItem
                key={item.id}
                id={item.id}
                path={item.path}
                index={item.index}
                tokenCount={item.tokenCount}
                totalTokens={tokenCount}
                rootPath={rootPath}
                startToken={item.startToken}
                endToken={item.endToken}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer tip */}
      <div className="px-4 py-2.5 border-t border-(--border-color) bg-(--bg-tertiary)/50">
        <p className="text-[11px] text-(--text-muted) text-center">
          💡 <span className="font-medium">Tip:</span> Place entry points and core logic at the top or bottom for better AI understanding.
        </p>
      </div>
    </div>
  );
}
