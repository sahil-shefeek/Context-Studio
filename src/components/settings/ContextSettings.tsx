import { Gauge, Code2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { useState, useEffect } from "react";
import { Input, Separator } from "../ui";

export function ContextSettings() {
  const {
    targetContextWindow,
    setTargetContextWindow,
    maxFileSizeKb,
    setMaxFileSizeKb,
    outputFormat,
    setOutputFormat,
    isSettingsOpen,
  } = useAppStore(useShallow((s) => ({
    targetContextWindow: s.targetContextWindow,
    setTargetContextWindow: s.setTargetContextWindow,
    maxFileSizeKb: s.maxFileSizeKb,
    setMaxFileSizeKb: s.setMaxFileSizeKb,
    outputFormat: s.outputFormat,
    setOutputFormat: s.setOutputFormat,
    isSettingsOpen: s.isSettingsOpen,
  })));

  const [localContextWindow, setLocalContextWindow] = useState(targetContextWindow.toString());
  const [localMaxFileSize, setLocalMaxFileSize] = useState(maxFileSizeKb.toString());

  // Sync local state with store when opening
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalContextWindow(targetContextWindow.toString());
      setLocalMaxFileSize(maxFileSizeKb.toString());
    }
  }, [isSettingsOpen, targetContextWindow, maxFileSizeKb]);

  const handleContextWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalContextWindow(e.target.value);
  };

  const handleContextWindowBlurOrEnter = () => {
    const num = parseInt(localContextWindow, 10);
    if (!isNaN(num) && num > 0) {
      setTargetContextWindow(num);
      setLocalContextWindow(num.toString());
    } else {
      setLocalContextWindow(targetContextWindow.toString());
    }
  };

  const handleMaxFileSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalMaxFileSize(e.target.value);
  };

  const handleMaxFileSizeBlurOrEnter = () => {
    const num = parseInt(localMaxFileSize, 10);
    if (!isNaN(num) && num > 0) {
      setMaxFileSizeKb(num);
      setLocalMaxFileSize(num.toString());
    } else {
      setLocalMaxFileSize(maxFileSizeKb.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* Context Window Settings */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <Gauge className="w-4 h-4 text-(--accent-color)" />
          Target Context Window
        </h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1">
              Token Limit
            </label>
            <Input
              type="number"
              value={localContextWindow}
              onChange={handleContextWindowChange}
              onBlur={handleContextWindowBlurOrEnter}
              onKeyDown={(e) => e.key === 'Enter' && handleContextWindowBlurOrEnter()}
              min="1000"
              step="1000"
            />
            <p className="text-xs text-(--text-muted) mt-1">
              Set the target token limit for your AI model (e.g., 128000 for GPT-4, 200000 for Claude)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[32000, 64000, 128000, 200000].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setLocalContextWindow(preset.toString());
                  setTargetContextWindow(preset);
                }}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  targetContextWindow === preset
                    ? "bg-(--accent-color) border-(--accent-color) text-white"
                    : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color)"
                }`}
              >
                {(preset / 1000)}K
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Max File Size */}
      <section>
        <h3 className="text-sm font-medium text-(--text-primary) mb-3">Max File Size</h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1">
              Size Limit (KB)
            </label>
            <Input
              type="number"
              value={localMaxFileSize}
              onChange={handleMaxFileSizeChange}
              onBlur={handleMaxFileSizeBlurOrEnter}
              onKeyDown={(e) => e.key === 'Enter' && handleMaxFileSizeBlurOrEnter()}
              min="64"
              step="64"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[256, 512, 1024, 2048, 5120].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setLocalMaxFileSize(preset.toString());
                  setMaxFileSizeKb(preset);
                }}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  maxFileSizeKb === preset
                    ? "bg-(--accent-color) border-(--accent-color) text-white"
                    : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color)"
                }`}
              >
                {preset >= 1024 ? `${preset / 1024}MB` : `${preset}KB`}
              </button>
            ))}
          </div>
          <div className="p-3 bg-(--bg-secondary) rounded-md border border-(--border-color)">
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              Files larger than this limit will be skipped. Lowering this value improves app performance 
              and prevents very large files from "drowning out" relevant information in the AI's context 
              (avoiding the "Lost in the Middle" effect).
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Output Format */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <Code2 className="w-4 h-4 text-(--accent-color)" />
          Output Format
        </h3>
        <div className="bg-(--bg-tertiary) rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            {([
              { id: "markdown", name: "Markdown", desc: "Classic markdown with code blocks" },
              { id: "xml", name: "XML", desc: "XML tags (better for Claude)" },
            ] as const).map((format) => (
              <button
                key={format.id}
                onClick={() => setOutputFormat(format.id)}
                className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${
                  outputFormat === format.id
                    ? "bg-(--accent-color) border-(--accent-color) text-white"
                    : "border-(--border-color) text-(--text-secondary) hover:border-(--accent-color) hover:text-(--text-primary)"
                }`}
              >
                {format.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-(--text-muted)">
            {outputFormat === "xml" 
              ? "XML format wraps files in <file path=\"...\">...</file> tags. Claude and some LLMs perform better with structured XML context."
              : "Markdown uses standard code blocks with language hints for syntax highlighting."
            }
          </p>
        </div>
      </section>
    </div>
  );
}
