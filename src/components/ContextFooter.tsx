import { useAppStore } from "../store/appStore";
import { Badge } from "./ui";

export function ContextFooter() {
  const {
    fileTree,
    generatedOutput,
    tokenCount,
    getContextPercentage,
    getContextStatus,
    targetContextWindow,
  } = useAppStore();

  const hasProject = !!fileTree;
  const contextPercentage = getContextPercentage();
  const contextStatus = getContextStatus();

  // Get simple status message
  const getStatusMessage = () => {
    if (!hasProject) return "Ready";
    if (generatedOutput.length > 0) return "Context Generated";
    return "Ready";
  };

  // Format token count with commas
  const formatTokens = (count: number) => {
    return count.toLocaleString();
  };

  return (
    <footer className="px-6 py-2 border-t border-(--border-color) flex items-center justify-between text-xs">
      <span className="text-(--text-muted)">{getStatusMessage()}</span>
      {hasProject && (
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{generatedOutput.length.toLocaleString()} chars</Badge>
          
          {/* Token count with progress indicator */}
          <div className="flex items-center gap-2">
            <div className="relative w-24 h-2 bg-(--bg-tertiary) rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                  contextStatus === 'red' 
                    ? 'bg-red-500' 
                    : contextStatus === 'yellow' 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, contextPercentage)}%` }}
              />
            </div>
            <Badge 
              variant="default"
              className={
                contextStatus === 'red' 
                  ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                  : contextStatus === 'yellow' 
                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' 
                    : ''
              }
              title={`${contextPercentage}% of ${targetContextWindow.toLocaleString()} token limit`}
            >
              {formatTokens(tokenCount)} tokens ({contextPercentage}%)
            </Badge>
          </div>
        </div>
      )}
    </footer>
  );
}
