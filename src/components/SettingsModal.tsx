import { Settings, Gauge, Filter, FileText, Info } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./ui";
import { useState } from "react";
import { GeneralSettings, ContextSettings, IgnoreSettings, TemplateSettings, AboutSettings } from "./settings";

type SettingsTab = "general" | "context" | "ignore" | "templates" | "about";

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useAppStore(
    useShallow((s) => ({
      isSettingsOpen: s.isSettingsOpen,
      closeSettings: s.closeSettings,
    }))
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-(--border-color) shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-44 border-r border-(--border-color) py-2 shrink-0">
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-0.5 p-0">
                {[
                  { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
                  { id: "context", label: "Context", icon: <Gauge className="w-4 h-4" /> },
                  { id: "ignore", label: "Ignore Rules", icon: <Filter className="w-4 h-4" /> },
                  { id: "templates", label: "Templates", icon: <FileText className="w-4 h-4" /> },
                  { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="w-full justify-start gap-2 px-4 py-2.5 rounded-none data-[state=active]:bg-(--accent-color)/10 data-[state=active]:text-(--accent-color) data-[state=active]:border-r-2 data-[state=active]:border-(--accent-color) data-[state=active]:shadow-none"
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="general" className="mt-0">
                <GeneralSettings />
              </TabsContent>

              <TabsContent value="context" className="mt-0">
                <ContextSettings />
              </TabsContent>

              <TabsContent value="ignore" className="mt-0">
                <IgnoreSettings />
              </TabsContent>

              <TabsContent value="templates" className="mt-0">
                <TemplateSettings />
              </TabsContent>

              <TabsContent value="about" className="mt-0">
                <AboutSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-(--border-color) shrink-0">
          <p className="text-xs text-center text-(--text-muted)">
            Made with ❤️ for AI-assisted development
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
