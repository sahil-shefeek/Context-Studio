import { get_encoding } from "@dqbd/tiktoken";
import type { FileNode, Theme, ResolvedTheme, RecentFolder, PromptTemplate, SessionState } from "./types";
import { DEFAULT_TEMPLATES } from "./types";

// =============================================================================
// TREE TRAVERSAL HELPERS
// =============================================================================

// Helper to get all paths from a node (including children)
export function getAllPaths(node: FileNode): string[] {
  const paths: string[] = [node.path];
  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllPaths(child));
    }
  }
  return paths;
}

// Helper to get all file paths from a tree (files only, no directories)
export function getAllFilePaths(node: FileNode): string[] {
  const paths: string[] = [];
  if (!node.is_dir) {
    paths.push(node.path);
  }
  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllFilePaths(child));
    }
  }
  return paths;
}

// Generate tree structure text similar to the 'tree' command
export function generateTreeText(node: FileNode, prefix: string = "", isLast: boolean = true, isRoot: boolean = true): string {
  let result = "";
  
  if (isRoot) {
    result += node.name + "\n";
  } else {
    result += prefix + (isLast ? "└── " : "├── ") + node.name + "\n";
  }

  if (node.children && node.children.length > 0) {
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children!.length - 1;
      result += generateTreeText(child, childPrefix, isLastChild, false);
    });
  }

  return result;
}

// =============================================================================
// CODE PROCESSING HELPERS
// =============================================================================

// Get language identifier from file extension for syntax highlighting
export function getLanguageId(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    toml: "toml",
    ini: "ini",
    env: "shell",
    dockerfile: "dockerfile",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || ext;
}

// =============================================================================
// TOKEN COUNTING - Singleton Encoder
// =============================================================================

// Singleton encoder — get_encoding() parses a massive WASM dictionary.
// Recreating it per call causes huge CPU spikes and UI stuttering.
let cachedEncoder: ReturnType<typeof get_encoding> | null = null;

function getEncoder() {
  if (!cachedEncoder) {
    cachedEncoder = get_encoding("cl100k_base");
  }
  return cachedEncoder;
}

// Count tokens using tiktoken (singleton encoder)
export function countTokens(text: string): number {
  try {
    const enc = getEncoder();
    return enc.encode(text).length;
  } catch {
    // Fallback: rough estimate (1 token ≈ 4 chars)
    return Math.ceil(text.length / 4);
  }
}

// =============================================================================
// THEME HELPERS
// =============================================================================

// Resolve theme to actual dark/light
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

// =============================================================================
// PRIVACY FILTER
// =============================================================================

// Privacy filter regex patterns
const PRIVACY_PATTERNS = [
  // API Keys (OpenAI, Google, AWS, etc.)
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: "sk-***REDACTED***" },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: "AIza***REDACTED***" },
  { pattern: /AKIA[A-Z0-9]{16}/g, replacement: "AKIA***REDACTED***" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: "ghp_***REDACTED***" },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: "gho_***REDACTED***" },
  { pattern: /glpat-[a-zA-Z0-9_-]{20,}/g, replacement: "glpat-***REDACTED***" },
  // .env values (KEY=value patterns)
  { pattern: /((?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|AUTH|CREDENTIALS|DB_PASS)[A-Z_]*)\s*=\s*["']?([^"'\s\n]+)["']?/gi, replacement: "$1=***REDACTED***" },
  // SSH Private Keys
  { pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g, replacement: "-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----" },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, replacement: "Bearer ***REDACTED***" },
  // Generic long hex strings (potential secrets)
  { pattern: /['\"]\b[a-f0-9]{32,}\b['\"]/gi, replacement: '"***REDACTED_HEX***"' },
];

export function applyPrivacyFilter(text: string): string {
  let filtered = text;
  for (const { pattern, replacement } of PRIVACY_PATTERNS) {
    filtered = filtered.replace(pattern, replacement);
  }
  return filtered;
}

// =============================================================================
// LOCAL STORAGE PERSISTENCE
// =============================================================================

// Get initial theme from localStorage (now supports 'system')
export function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved && ["dark", "light", "system"].includes(saved)) return saved;
  return "system"; // Default to system theme
}

// Load recent folders from localStorage
export function loadRecentFoldersFromStorage(): RecentFolder[] {
  try {
    const saved = localStorage.getItem("recentFolders");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save recent folders to localStorage
export function saveRecentFolders(folders: RecentFolder[]) {
  localStorage.setItem("recentFolders", JSON.stringify(folders.slice(0, 5)));
}

// Load selected template from localStorage
export function loadSelectedTemplateFromStorage(): string {
  return localStorage.getItem("selectedTemplate") || "none";
}

// Save selected template to localStorage
export function saveSelectedTemplate(templateId: string) {
  localStorage.setItem("selectedTemplate", templateId);
}

// Load target context window from localStorage
export function loadTargetContextWindow(): number {
  const saved = localStorage.getItem("targetContextWindow");
  return saved ? parseInt(saved, 10) : 128000;
}

// Save target context window to localStorage
export function saveTargetContextWindow(tokens: number) {
  localStorage.setItem("targetContextWindow", tokens.toString());
}

// Load custom ignore patterns from localStorage
export function loadCustomIgnorePatterns(): string {
  return localStorage.getItem("customIgnorePatterns") || "";
}

// Save custom ignore patterns to localStorage
export function saveCustomIgnorePatterns(patterns: string) {
  localStorage.setItem("customIgnorePatterns", patterns);
}

// Load output format from localStorage
export function loadOutputFormat(): "markdown" | "xml" {
  const saved = localStorage.getItem("outputFormat");
  return saved === "xml" ? "xml" : "markdown";
}

// Save output format to localStorage
export function saveOutputFormat(format: string) {
  localStorage.setItem("outputFormat", format);
}

// Load restore session on startup setting
export function loadRestoreSessionOnStartup(): boolean {
  return localStorage.getItem("restoreSessionOnStartup") !== "false"; // Default true
}

export function saveRestoreSessionOnStartup(enabled: boolean) {
  localStorage.setItem("restoreSessionOnStartup", enabled.toString());
}

// Load max file size in KB
export function loadMaxFileSizeKb(): number {
  const saved = localStorage.getItem("maxFileSizeKb");
  return saved ? parseInt(saved, 10) : 1024; // Default 1MB
}

export function saveMaxFileSizeKb(size: number) {
  localStorage.setItem("maxFileSizeKb", size.toString());
}

// Load ignore settings
export function loadRespectGitignore(): boolean {
  return localStorage.getItem("respectGitignore") !== "false"; // Default true
}

export function saveRespectGitignore(enabled: boolean) {
  localStorage.setItem("respectGitignore", enabled.toString());
}

export function loadRespectDockerignore(): boolean {
  return localStorage.getItem("respectDockerignore") === "true"; // Default false
}

export function saveRespectDockerignore(enabled: boolean) {
  localStorage.setItem("respectDockerignore", enabled.toString());
}

export function loadRespectAiignore(): boolean {
  return localStorage.getItem("respectAiignore") !== "false"; // Default true
}

export function saveRespectAiignore(enabled: boolean) {
  localStorage.setItem("respectAiignore", enabled.toString());
}

export function loadFrameworkPresets(): string[] {
  try {
    const saved = localStorage.getItem("frameworkPresets");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function saveFrameworkPresets(presets: string[]) {
  localStorage.setItem("frameworkPresets", JSON.stringify(presets));
}

// Load custom prompt templates
export function loadCustomTemplates(): PromptTemplate[] {
  try {
    const saved = localStorage.getItem("customTemplates");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function saveCustomTemplates(templates: PromptTemplate[]) {
  localStorage.setItem("customTemplates", JSON.stringify(templates));
}

// Get all templates (default + custom)
export function getAllTemplates(): PromptTemplate[] {
  const customTemplates = loadCustomTemplates();
  return [...DEFAULT_TEMPLATES, ...customTemplates];
}

// Load session state from localStorage
export function loadSessionState(): SessionState | null {
  try {
    const saved = localStorage.getItem("sessionState");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save session state to localStorage
export function saveSessionState(rootPath: string, selectedPaths: string[], orderedSelection: string[] = []) {
  localStorage.setItem("sessionState", JSON.stringify({ rootPath, selectedPaths, orderedSelection }));
}

// Clear session state from localStorage
export function clearSessionState() {
  localStorage.removeItem("sessionState");
}

// Add folder to recent list
export function addToRecentFolders(path: string, existingFolders: RecentFolder[]): RecentFolder[] {
  const name = path.split('/').pop() || path;
  const newEntry: RecentFolder = { path, name, lastOpened: Date.now() };
  
  // Remove existing entry with same path
  const filtered = existingFolders.filter(f => f.path !== path);
  
  // Add to beginning and limit to 5
  const updated = [newEntry, ...filtered].slice(0, 5);
  saveRecentFolders(updated);
  return updated;
}

// =============================================================================
// DEBOUNCE TIMERS (module-level singletons)
// =============================================================================

// Debounce timer for generateContext
export let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function setDebounceTimer(timer: ReturnType<typeof setTimeout> | null) {
  debounceTimer = timer;
}

// Debounce timer for token counting (separate from generation)
export let tokenCountTimer: ReturnType<typeof setTimeout> | null = null;
export function setTokenCountTimer(timer: ReturnType<typeof setTimeout> | null) {
  tokenCountTimer = timer;
}

// =============================================================================
// GENERATION ID (for async race condition prevention)
// =============================================================================

// Monotonically increasing generation ID to prevent stale async results
// from overwriting newer data when out-of-order completions occur.
let _currentGenerationId = 0;

export function nextGenerationId(): number {
  return ++_currentGenerationId;
}

export function getCurrentGenerationId(): number {
  return _currentGenerationId;
}
