import { X } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useEffect } from "react";
import { Button, Badge } from "./ui";
import { CodeMirrorEditor } from "./CodeMirrorEditor";

interface FilePreviewModalProps {
  filePath: string;
  fileName: string;
  content: string;
  onClose: () => void;
}

// Get language identifier from file extension for syntax highlighting
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    toml: "toml",
    ini: "ini",
    env: "shell",
    dockerfile: "dockerfile",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "text";
}

export function FilePreviewModal({ filePath, fileName, content, onClose }: FilePreviewModalProps) {
  const { theme } = useAppStore();

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const language = getLanguageFromPath(filePath);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-4xl h-[80vh] bg-(--bg-primary) rounded-lg border border-(--border-color) shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-color) bg-(--bg-secondary)">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-(--text-primary)">{fileName}</span>
            <span className="text-xs text-(--text-muted) truncate max-w-[500px]">{filePath}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <CodeMirrorEditor
            value={content}
            onChange={() => {}}
            theme={theme}
            readOnly={true}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-(--border-color) bg-(--bg-secondary) flex items-center justify-between text-xs text-(--text-secondary)">
          <Badge variant="secondary">{language}</Badge>
          <span>{content.split("\n").length} lines • {content.length.toLocaleString()} characters</span>
        </div>
      </div>
    </div>
  );
}
