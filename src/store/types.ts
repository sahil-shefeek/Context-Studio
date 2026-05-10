// =============================================================================
// SHARED TYPES & INTERFACES
// =============================================================================

// Types matching the Rust FileNode structure
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
export type OutputFormat = "markdown" | "xml";

// Ignore settings matching Rust struct
export interface IgnoreSettings {
  respect_gitignore: boolean;
  respect_dockerignore: boolean;
  respect_aiignore: boolean;
  framework_presets: string[];
  custom_patterns: string[];
}

// Recent folder entry
export interface RecentFolder {
  path: string;
  name: string;
  lastOpened: number;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  name: string;
  text: string;
  isDefault?: boolean;
}

// Session state interface
export interface SessionState {
  rootPath: string;
  selectedPaths: string[];
  orderedSelection: string[];
}

// =============================================================================
// DEFAULT TEMPLATES
// =============================================================================

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "none",
    name: "No Template",
    text: "",
    isDefault: true,
  },
  {
    id: "general",
    name: "General Context",
    text: "Please use the following project structure and file contents as context for our conversation.\n\n",
    isDefault: true,
  },
  {
    id: "code-review",
    name: "Code Review",
    text: "Act as a Senior Developer. Review the following code for bugs, security vulnerabilities, and performance bottlenecks.\n\n",
    isDefault: true,
  },
  {
    id: "refactor",
    name: "Refactor",
    text: "Suggest improvements to the following code to make it more readable, modular, and maintainable.\n\n",
    isDefault: true,
  },
  {
    id: "explain",
    name: "Explain Code",
    text: "Please explain what this code does, including its main components and how they interact.\n\n",
    isDefault: true,
  },
  {
    id: "debug",
    name: "Debug Helper",
    text: "I'm experiencing an issue with this code. Please analyze it and help me identify potential bugs or problems.\n\n",
    isDefault: true,
  },
];

// =============================================================================
// FRAMEWORK PRESETS
// =============================================================================

export const FRAMEWORK_PRESETS = [
  { id: "react-vite", name: "React / Vite" },
  { id: "rust-cargo", name: "Rust / Cargo" },
  { id: "python-venv", name: "Python / Venv / uv" },
  { id: "nodejs", name: "Node.js" },
  { id: "nextjs", name: "Next.js" },
  { id: "golang", name: "Go" },
  { id: "flutter", name: "Flutter" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C / C++" },
] as const;
