import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  ArrowRight,
  ListOrdered,
  Copy,
  Shield,
  Zap,
  Target
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-(--accent-color)" />
            How to Use Context Studio
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Introduction */}
          <section>
            <p className="text-sm text-(--text-secondary) leading-relaxed">
              Context Studio helps you create optimized context windows for AI assistants. 
              By understanding how LLMs process information, you can dramatically improve 
              the quality of AI responses.
            </p>
          </section>

          {/* Lost in the Middle Explanation */}
          <section className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <h3 className="text-sm font-semibold text-(--text-primary) mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              The "Lost in the Middle" Effect
            </h3>
            <p className="text-sm text-(--text-secondary) mb-3">
              Research shows that Large Language Models pay <strong className="text-(--text-primary)">more attention 
              to content at the beginning and end</strong> of their context window. Information in the middle 
              often gets "lost" and has less influence on the model's output.
            </p>
            <div className="flex items-center justify-center gap-2 p-3 bg-(--bg-primary) rounded-lg">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-500/20 text-green-500 text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                High Attention
              </div>
              <ArrowRight className="w-4 h-4 text-(--text-muted)" />
              <div className="px-3 py-1.5 rounded bg-(--bg-tertiary) text-(--text-muted) text-xs font-medium">
                Lower Attention
              </div>
              <ArrowRight className="w-4 h-4 text-(--text-muted)" />
              <div className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-500/20 text-blue-500 text-xs font-medium">
                <Brain className="w-3 h-3" />
                High Attention
              </div>
            </div>
          </section>

          {/* How to Optimize */}
          <section>
            <h3 className="text-sm font-semibold text-(--text-primary) mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-(--accent-color)" />
              How to Optimize Your Context
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-500 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-(--text-primary)">Place Important Files First (Primacy)</h4>
                  <p className="text-xs text-(--text-muted) mt-0.5">
                    Entry points, main logic files, and core interfaces should be at the top of your context.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-500 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-(--text-primary)">Keep Key Code at the End (Recency)</h4>
                  <p className="text-xs text-(--text-muted) mt-0.5">
                    The specific file you're working on or asking about should be near the end.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-500 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-(--text-primary)">Less Critical Files in the Middle</h4>
                  <p className="text-xs text-(--text-muted) mt-0.5">
                    Supporting utilities, constants, and type definitions can go in the middle.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Guide */}
          <section>
            <h3 className="text-sm font-semibold text-(--text-primary) mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Key Features
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="flex items-center gap-2 mb-1">
                  <ListOrdered className="w-4 h-4 text-(--accent-color)" />
                  <span className="text-sm font-medium text-(--text-primary)">Organize Context</span>
                </div>
                <p className="text-xs text-(--text-muted)">
                  Drag and drop files to optimize their order for AI attention.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-(--text-primary)">Privacy Filter</span>
                </div>
                <p className="text-xs text-(--text-muted)">
                  Automatically masks API keys, passwords, and secrets.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="flex items-center gap-2 mb-1">
                  <Copy className="w-4 h-4 text-(--accent-color)" />
                  <span className="text-sm font-medium text-(--text-primary)">Prompt Templates</span>
                </div>
                <p className="text-xs text-(--text-muted)">
                  Pre-built templates for code review, debugging, and more.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-(--bg-secondary) border border-(--border-color)">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-(--text-primary)">Token Tracking</span>
                </div>
                <p className="text-xs text-(--text-muted)">
                  Monitor context size to stay within model limits.
                </p>
              </div>
            </div>
          </section>

          {/* Pro Tips */}
          <section className="p-4 rounded-lg bg-(--bg-tertiary) border border-(--border-color)">
            <h3 className="text-sm font-semibold text-(--text-primary) mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-(--text-secondary) space-y-2">
              <li className="flex gap-2">
                <span className="text-(--text-muted)">•</span>
                <span>Use XML output format for Claude models – they're specifically trained on XML structure.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--text-muted)">•</span>
                <span>Include a project's README at the start to give the AI overall context.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--text-muted)">•</span>
                <span>Shift+Click in the file tree for quick range selection.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--text-muted)">•</span>
                <span>Edit the generated output directly before copying if needed.</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-end pt-2 border-t border-(--border-color)">
          <Button variant="default" size="sm" onClick={onClose}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
