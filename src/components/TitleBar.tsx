import { Minus, Square, X, Maximize2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { useState, useEffect } from "react";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);

  useEffect(() => {
    // Check platform to hide window controls on macOS
    const checkPlatform = async () => {
      try {
        const os = platform();
        setIsMacOS(os === "macos");
      } catch {
        // Fallback: assume not macOS
        setIsMacOS(false);
      }
    };
    checkPlatform();

    const checkMaximized = async () => {
      const appWindow = getCurrentWindow();
      setIsMaximized(await appWindow.isMaximized());
    };
    checkMaximized();

    // Listen for window resize events to update maximize state
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  return (
    <div className="h-10 min-h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center select-none">
      {/* Left: Draggable region with app branding */}
      <div 
        className="flex-1 flex items-center gap-2 px-4 h-full"
        data-tauri-drag-region
      >
        <div className="w-5 h-5 rounded bg-[var(--accent-color)] flex items-center justify-center pointer-events-none">
          <span className="text-white text-xs font-bold">CC</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)] pointer-events-none">
          Context Catcher
        </span>
      </div>

      {/* Right: Window controls - NOT draggable, hidden on macOS */}
      {!isMacOS && (
        <div className="flex items-center h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Square className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClose}
            className="h-full px-4 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-[var(--text-secondary)]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
