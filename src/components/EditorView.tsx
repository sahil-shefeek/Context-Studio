import { ChevronDown } from "lucide-react";
import { useAppStore, PromptTemplate } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useState, useCallback } from "react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";

interface EditorViewProps {
  selectedTemplate: PromptTemplate | undefined;
  hasActiveTemplate: boolean;
}

export function EditorView({ selectedTemplate, hasActiveTemplate }: EditorViewProps) {
  const {
    generatedOutput,
    resolvedTheme,
    setGeneratedOutput,
  } = useAppStore(useShallow((s) => ({
    generatedOutput: s.generatedOutput,
    resolvedTheme: s.resolvedTheme,
    setGeneratedOutput: s.setGeneratedOutput,
  })));
  
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(true);

  // Handle manual text edits - updates counts automatically
  const handleOutputChange = useCallback((value: string) => {
    setGeneratedOutput(value);
  }, [setGeneratedOutput]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300 gap-3">
      {/* Accordion: Active Prompt Template */}
      {hasActiveTemplate && (
        <div className="bg-(--bg-secondary) rounded-lg border border-(--border-color) overflow-hidden shrink-0">
          <button
            onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-(--bg-tertiary) transition-colors"
          >
            <span className="text-xs font-medium text-(--text-muted) uppercase tracking-wider">
              System Prompt Template
            </span>
            <ChevronDown 
              className={`w-4 h-4 text-(--text-muted) transition-transform duration-200 ${isTemplateExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {isTemplateExpanded && (
            <div className="px-4 py-3 border-t border-(--border-color) bg-(--bg-tertiary)/50">
              <p className="text-sm text-(--text-secondary) whitespace-pre-wrap leading-relaxed">
                {selectedTemplate?.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CodeMirror Editor */}
      <div className="flex-1 bg-(--code-bg) rounded-lg border border-(--border-color) overflow-hidden min-h-0">
        <CodeMirrorEditor
          value={generatedOutput}
          onChange={handleOutputChange}
          theme={resolvedTheme}
          placeholder="Generated context will appear here..."
        />
      </div>
      <p className="text-xs text-(--text-muted) text-center flex-shrink-0">
        💡 You can edit this text before copying. Character and token counts update automatically.
      </p>
    </div>
  );
}
