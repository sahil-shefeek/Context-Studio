import { FileText, Copy, Download, Loader2, Check, Shield, ShieldCheck, PanelLeft, AlertTriangle, ListOrdered } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useState } from "react";
import { Button, Select } from "./ui";
import { OrganizeContext } from "./OrganizeContext";
import { DocumentationModal } from "./DocumentationModal";
import { WelcomeScreen } from "./WelcomeScreen";
import { EditorView } from "./EditorView";
import { ContextFooter } from "./ContextFooter";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";

export function MainContent() {
  const { 
    fileTree, 
    generatedOutput, 
    isGenerating, 
    isRefreshing,
    isPrivacyFilterEnabled,
    setPrivacyFilterEnabled,
    sidebarCollapsed,
    toggleSidebar,
    promptTemplates,
    selectedTemplateId,
    setSelectedTemplate,
    getOutputWithTemplate,
    getOrderedSelectedFiles,
    isExporting,
    setExporting,
  } = useAppStore();
  
  const [copied, setCopied] = useState(false);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [showOrganizeView, setShowOrganizeView] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);

  const hasOutput = generatedOutput.length > 0;
  const hasProject = !!fileTree;
  const hasSelectedFiles = getOrderedSelectedFiles().length > 0;

  // Get selected template
  const selectedTemplate = promptTemplates.find(t => t.id === selectedTemplateId);
  const hasActiveTemplate = selectedTemplate && selectedTemplate.id !== "none" && selectedTemplate.text;

  // Convert templates to select options
  const templateOptions = promptTemplates.map(t => ({
    value: t.id,
    label: t.name,
  }));

  // Handle privacy filter toggle with confirmation
  const handlePrivacyToggle = () => {
    if (isPrivacyFilterEnabled) {
      setShowPrivacyWarning(true);
    } else {
      setPrivacyFilterEnabled(true);
    }
  };

  const confirmDisablePrivacy = () => {
    setPrivacyFilterEnabled(false);
    setShowPrivacyWarning(false);
  };

  const handleCopy = async () => {
    const outputWithTemplate = getOutputWithTemplate();
    if (!outputWithTemplate) return;
    try {
      await navigator.clipboard.writeText(outputWithTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = async () => {
    const outputWithTemplate = getOutputWithTemplate();
    if (!outputWithTemplate) return;
    
    setExporting(true);
    try {
      const filePath = await save({
        filters: [{ name: "Markdown", extensions: ["md"] }],
        defaultPath: "context.md",
      });
      
      if (filePath) {
        await writeTextFile(filePath, outputWithTemplate);
        toast.success("Context exported successfully", {
          description: filePath,
          action: {
            label: "Open File",
            onClick: () => openPath(filePath),
          },
          cancel: {
            label: "Show in Folder",
            onClick: () => revealItemInDir(filePath),
          },
        });
      }
    } catch (err) {
      console.error("Failed to export:", err);
      toast.error("Failed to export context", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  };

  // Header title based on project state
  const headerTitle = hasProject ? "Output Preview" : "Context Studio";

  return (
    <main className="flex-1 flex flex-col h-full bg-(--bg-primary) relative">
      {/* Privacy Warning Modal */}
      {showPrivacyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-(--text-primary)">Disable Privacy Filter?</h3>
            </div>
            <p className="text-sm text-(--text-secondary) mb-4">
              <strong className="text-yellow-500">Warning:</strong> Disabling the privacy filter may expose sensitive information like API keys, passwords, or environment variables in your context output.
            </p>
            <p className="text-sm text-(--text-muted) mb-6">
              Only disable this if you're sure your selected files don't contain secrets, or if you need to include them intentionally.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowPrivacyWarning(false)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={confirmDisablePrivacy}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Disable Filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-(--border-color) flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
          <FileText className="w-5 h-5 text-(--accent-color)" />
          <h1 className="text-lg font-semibold text-(--text-primary)">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasProject && (
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplate}
              options={templateOptions}
              placeholder="Select template..."
              className="w-40"
            />
          )}

          {hasProject && hasSelectedFiles && (
            <Button
              variant={showOrganizeView ? "default" : "secondary"}
              size="icon-sm"
              onClick={() => setShowOrganizeView(!showOrganizeView)}
              className={showOrganizeView ? "bg-(--accent-color)/20 text-(--accent-color) hover:bg-(--accent-color)/30" : ""}
              title={showOrganizeView ? "Show output preview" : "Organize context order"}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          )}

          {hasProject && (
            <Button
              variant={isPrivacyFilterEnabled ? "default" : "secondary"}
              size="icon-sm"
              onClick={handlePrivacyToggle}
              className={isPrivacyFilterEnabled ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}
              title={isPrivacyFilterEnabled ? "Privacy filter enabled - secrets are masked" : "Enable privacy filter to mask secrets"}
            >
              {isPrivacyFilterEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </Button>
          )}
          
          {hasProject && (
            <>
              <div className="w-px h-6 bg-(--border-color)" />
              
              <Button 
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                disabled={!hasOutput}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={!hasOutput || isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isExporting ? "Exporting..." : "Export"}</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {(isGenerating || isRefreshing) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-(--accent-color)" />
              <span className="text-sm font-medium text-(--text-primary)">
                {isRefreshing ? "Refreshing context..." : "Generating context..."}
              </span>
            </div>
          </div>
        )}

        <div className="h-full transition-all duration-300 ease-in-out">
          {!fileTree ? (
            <WelcomeScreen onOpenDocumentation={() => setShowDocumentation(true)} />
          ) : !hasOutput ? (
            <div className="flex flex-col items-center justify-center h-full min-h-100 text-center animate-in fade-in duration-300">
              <FileText className="w-16 h-16 text-(--border-color) mb-4" />
              <h2 className="text-xl font-semibold text-(--text-primary) mb-2">Select Files</h2>
              <p className="text-(--text-secondary) max-w-md mb-4">
                Use the checkboxes in the file tree to select the files you want to include.
                Click on folders to select all files within them.
              </p>
              <p className="text-xs text-(--text-muted)">
                <kbd className="px-1.5 py-0.5 rounded bg-(--bg-tertiary) mr-1">Shift</kbd>
                + Click for range selection
              </p>
            </div>
          ) : showOrganizeView ? (
            <div className="h-full bg-(--bg-secondary) rounded-lg border border-(--border-color) overflow-hidden animate-in fade-in duration-300">
              <OrganizeContext />
            </div>
          ) : (
            <EditorView 
              selectedTemplate={selectedTemplate} 
              hasActiveTemplate={!!hasActiveTemplate} 
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <ContextFooter />

      {/* Documentation Modal */}
      <DocumentationModal 
        isOpen={showDocumentation} 
        onClose={() => setShowDocumentation(false)} 
      />
    </main>
  );
}
