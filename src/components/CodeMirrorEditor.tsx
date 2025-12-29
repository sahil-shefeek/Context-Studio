import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { Theme } from "../store/appStore";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: Theme;
  placeholder?: string;
  readOnly?: boolean;
}

// Light theme styling
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--code-bg)",
    color: "var(--text-primary)",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, Consolas, monospace",
    fontSize: "13px",
    lineHeight: "1.5",
    padding: "16px",
    caretColor: "var(--accent-color)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-muted)",
    border: "none",
    borderRight: "1px solid var(--border-color)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-tertiary)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(59, 130, 246, 0.2) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(59, 130, 246, 0.3) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--accent-color)",
  },
  ".cm-placeholder": {
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
}, { dark: false });

// Dark theme extension (combines oneDark with custom overrides)
const darkThemeOverrides = EditorView.theme({
  "&": {
    backgroundColor: "var(--code-bg)",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, Consolas, monospace",
    fontSize: "13px",
    lineHeight: "1.5",
    padding: "16px",
    caretColor: "var(--accent-color)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-muted)",
    border: "none",
    borderRight: "1px solid var(--border-color)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-tertiary)",
  },
  ".cm-placeholder": {
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
}, { dark: true });

// Placeholder extension
function placeholder(text: string): Extension {
  return EditorView.contentAttributes.of({
    "data-placeholder": text,
  });
}

export function CodeMirrorEditor({ 
  value, 
  onChange, 
  theme, 
  placeholder: placeholderText = "",
  readOnly = false 
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date
  onChangeRef.current = onChange;

  // Create update listener
  const updateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        onChangeRef.current(newValue);
      }
    });
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      markdown(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener(),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    // Add theme
    if (theme === "dark") {
      extensions.push(oneDark, darkThemeOverrides);
    } else {
      extensions.push(lightTheme);
    }

    // Add placeholder
    if (placeholderText) {
      extensions.push(placeholder(placeholderText));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, readOnly]); // Recreate on theme/readOnly change

  // Update content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full overflow-hidden codemirror-wrapper"
    />
  );
}
