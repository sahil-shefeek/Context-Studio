import { useEffect } from "react";
import { Sidebar, MainContent } from "./components";
import { useAppStore } from "./store/appStore";

function App() {
  const { theme } = useAppStore();

  // Apply theme class on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Disable browser context menu globally for native app feel
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
