import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { Sidebar, MainContent } from "./components";
import { useAppStore } from "./store/appStore";

function App() {
  const { theme, toggleTheme } = useAppStore();

  // Apply theme class on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Theme toggle button - fixed position */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>
      
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
