import { FileText, Plus, Edit2, Check, XCircle, RotateCcw } from "lucide-react";
import { useAppStore, PromptTemplate } from "../../store/appStore";
import { useState } from "react";
import { Button, Input, Textarea } from "../ui";

export function TemplateSettings() {
  const {
    promptTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetTemplatesToDefault,
  } = useAppStore();

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateText, setNewTemplateText] = useState("");
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  const handleAddTemplate = () => {
    if (newTemplateName.trim() && newTemplateText.trim()) {
      addTemplate(newTemplateName.trim(), newTemplateText.trim());
      setNewTemplateName("");
      setNewTemplateText("");
      setIsAddingTemplate(false);
    }
  };

  const handleSaveTemplateEdit = (template: PromptTemplate) => {
    updateTemplate(template.id, newTemplateName.trim() || template.name, newTemplateText);
    setEditingTemplate(null);
    setNewTemplateName("");
    setNewTemplateText("");
  };

  const startEditingTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template.id);
    setNewTemplateName(template.name);
    setNewTemplateText(template.text);
  };

  const handleRestoreDefaults = () => {
    if (confirm("This will remove all custom templates and reset defaults. Continue?")) {
      resetTemplatesToDefault();
    }
  };

  // Check if there are any custom templates
  const hasCustomTemplates = promptTemplates.some(t => !t.isDefault);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-(--text-primary)">
            <FileText className="w-4 h-4 text-(--accent-color)" />
            Prompt Templates
          </h3>
          <div className="flex gap-2">
            {hasCustomTemplates && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreDefaults}
                title="Reset all templates to defaults"
              >
                <RotateCcw className="w-4 h-4" />
                Restore Defaults
              </Button>
            )}
            {!isAddingTemplate && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddingTemplate(true)}
              >
                <Plus className="w-4 h-4" />
                Add Template
              </Button>
            )}
          </div>
        </div>

        {/* Add Template Form */}
        {isAddingTemplate && (
          <div className="bg-(--bg-tertiary) rounded-lg p-4 mb-4 border-2 border-(--accent-color)">
            <h4 className="text-sm font-medium text-(--text-primary) mb-3">New Template</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name..."
              />
              <Textarea
                value={newTemplateText}
                onChange={(e) => setNewTemplateText(e.target.value)}
                placeholder="Template prompt text..."
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingTemplate(false);
                    setNewTemplateName("");
                    setNewTemplateText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddTemplate}
                  disabled={!newTemplateName.trim() || !newTemplateText.trim()}
                >
                  <Check className="w-4 h-4" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Template List */}
        <div className="space-y-2">
          {promptTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-(--bg-tertiary) rounded-lg p-4"
            >
              {editingTemplate === template.id ? (
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Template name..."
                  />
                  <Textarea
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(null);
                        setNewTemplateName("");
                        setNewTemplateText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSaveTemplateEdit(template)}
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-(--text-primary)">
                        {template.name}
                      </span>
                      {template.isDefault && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-(--accent-color)/10 text-(--accent-color)">
                          Default
                        </span>
                      )}
                    </div>
                    {template.text && (
                      <p className="text-xs text-(--text-muted) mt-1 line-clamp-2">
                        {template.text}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {template.id !== "none" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startEditingTemplate(template)}
                          title="Edit template"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!template.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (confirm(`Delete template "${template.name}"?`)) {
                                deleteTemplate(template.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Delete template"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
