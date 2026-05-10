import { Minus, Square, X, Maximize2, Settings } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../store/appStore";
import logoImg from "../assets/logo-1-no-bg.png";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);
  const openSettings = useAppStore((s) => s.openSettings);

  // Manual drag handler for better cross-platform support (especially Linux)
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    // Only handle left mouse button and ignore if clicking on interactive elements
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    // Skip if clicking on buttons or other interactive elements
    if (target.closest('button')) return;

    const appWindow = getCurrentWindow();
    if (e.detail === 2) {
      // Double click to toggle maximize
      await appWindow.toggleMaximize();
    } else {
      // Single click to start dragging
      await appWindow.startDragging();
    }
  }, []);

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
    <div className="h-10 min-h-10 bg-(--bg-secondary) border-b border-(--border-color) flex items-center select-none">
      {/* Left: Draggable region with app branding */}
      <div
        className="flex-1 flex items-center gap-2 px-4 h-full cursor-default"
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
      >
        <img src={logoImg} alt="Context Studio" className="w-5 h-5 pointer-events-none" />
        <span className="text-sm font-semibold text-(--text-primary) pointer-events-none">
          Context Studio
        </span>
      </div>

      {/* Right: Settings + Window controls */}
      <div className="flex items-center h-full">
        {/* Settings button */}
        <button
          onClick={openSettings}
          className="h-full px-3 flex items-center justify-center hover:bg-(--bg-tertiary) transition-colors text-(--text-secondary) hover:text-(--text-primary)"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Window controls - hidden on macOS */}
        {!isMacOS && (
          <>
            <div className="w-px h-4 bg-(--border-color)" />
            <button
              onClick={handleMinimize}
              className="h-full px-4 flex items-center justify-center hover:bg-(--bg-tertiary) transition-colors text-(--text-secondary) hover:text-(--text-primary)"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="h-full px-4 flex items-center justify-center hover:bg-(--bg-tertiary) transition-colors text-(--text-secondary) hover:text-(--text-primary)"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Square className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleClose}
              className="h-full px-4 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-(--text-secondary)"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
