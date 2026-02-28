import { Github, Keyboard } from "lucide-react";
import { Separator } from "../ui";
import logoImg from "../../assets/logo-1-no-bg.png";

export function AboutSettings() {
  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="space-y-6 about-section">
      <section>
        <div
          className="bg-(--bg-tertiary) rounded-lg p-4 space-y-4"
        // style={{
        //   WebkitFontSmoothing: 'antialiased',
        //   MozOsxFontSmoothing: 'grayscale',
        //   transform: 'translateZ(0)',
        //   backfaceVisibility: 'hidden',
        // }}
        >
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Context Studio" className="w-12 h-12 rounded-lg" style={{ transform: 'translateZ(0)' }} />
            <div>
              <h4 className="font-semibold text-(--text-primary) text-base tracking-tight">
                Context Studio
              </h4>
              <p className="text-xs text-(--text-muted) font-medium">Version 1.0.0</p>
            </div>
          </div>
          <p
            className="text-sm text-(--text-secondary) leading-relaxed"
          // style={{
          //   WebkitFontSmoothing: 'antialiased',
          //   letterSpacing: '0.01em',
          // }}
          >
            Context Studio aggregates project files into AI-friendly context. Built with Tauri 2.0 + React.
          </p>
          <a
            href="https://github.com/sahil-shefeek/Context-Studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-(--accent-color) hover:underline font-medium"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
      </section>

      <Separator />

      {/* Keyboard Shortcuts */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary) mb-3">
          <Keyboard className="w-4 h-4 text-(--accent-color)" />
          Keyboard Shortcuts
        </h3>
        <div
          className="grid grid-cols-2 gap-2 text-sm"
          style={{
            WebkitFontSmoothing: 'antialiased',
            transform: 'translateZ(0)',
          }}
        >
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
            <span className="text-(--text-secondary)">Open Folder</span>
            <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted) font-mono">
              {cmdKey} O
            </kbd>
          </div>
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
            <span className="text-(--text-secondary)">Settings</span>
            <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted) font-mono">
              {cmdKey} ,
            </kbd>
          </div>
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
            <span className="text-(--text-secondary)">Copy Context</span>
            <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted) font-mono">
              {cmdKey} C
            </kbd>
          </div>
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2">
            <span className="text-(--text-secondary)">Clear / Close</span>
            <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted) font-mono">
              {cmdKey} K
            </kbd>
          </div>
          <div className="flex items-center justify-between bg-(--bg-tertiary) rounded px-3 py-2 col-span-2">
            <span className="text-(--text-secondary)">Range Selection (File Tree)</span>
            <kbd className="px-2 py-0.5 rounded bg-(--bg-secondary) border border-(--border-color) text-xs text-(--text-muted) font-mono">
              Shift + Click
            </kbd>
          </div>
        </div>
      </section>
    </div>
  );
}
