use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use ignore::WalkBuilder;
use ignore::overrides::OverrideBuilder;

// =============================================================================
// Types
// =============================================================================

// File tree node structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

// Ignore settings from frontend
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IgnoreSettings {
    pub respect_gitignore: bool,
    pub respect_dockerignore: bool,
    pub respect_aiignore: bool,
    pub framework_presets: Vec<String>,
    pub custom_patterns: Vec<String>,
}

/// Managed state that tracks the user-approved root directory.
/// Prevents path traversal attacks via IPC — all file reads are
/// validated to be canonical descendants of this scope.
struct AllowedScope(Mutex<Option<PathBuf>>);

// =============================================================================
// Constants
// =============================================================================

// Directories/files to ignore by default
const SMART_IGNORE: &[&str] = &[
    "node_modules",
    ".git",
    "venv",
    ".venv",
    "__pycache__",
    ".DS_Store",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".cache",
    "coverage",
    ".idea",
    ".vscode",
    "*.pyc",
    ".env",
    ".env.local",
];

// Max file size for reading (1MB default)
const DEFAULT_MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB

// =============================================================================
// Framework Patterns
// =============================================================================

// Framework-specific ignore patterns
fn get_framework_patterns(framework: &str) -> Vec<&'static str> {
    match framework {
        "react-vite" => vec![
            "node_modules", "dist", ".vite", "*.local", ".env*", "coverage",
        ],
        "rust-cargo" => vec![
            "target", "Cargo.lock", "*.rlib", "*.rmeta", "*.d",
        ],
        "python-venv" => vec![
            "venv", ".venv", "__pycache__", "*.pyc", "*.pyo", ".pytest_cache",
            "*.egg-info", "dist", "build", ".eggs", ".tox", ".nox",
            ".mypy_cache", ".ruff_cache", ".uv",
        ],
        "nodejs" => vec![
            "node_modules", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*",
            ".npm", ".yarn", "*.tsbuildinfo",
        ],
        "nextjs" => vec![
            "node_modules", ".next", "out", ".vercel", ".env*.local",
        ],
        "golang" => vec![
            "bin", "pkg", "vendor", "*.exe", "*.test", "*.out", "go.sum",
        ],
        "flutter" => vec![
            ".dart_tool", ".flutter-plugins", ".flutter-plugins-dependencies",
            "build", "*.iml", ".idea", "android/.gradle", "ios/Pods",
        ],
        "java" => vec![
            "target", "*.class", "*.jar", "*.war", ".gradle", "build",
            ".idea", "*.iml", "out",
        ],
        "cpp" => vec![
            "build", "cmake-build-*", "*.o", "*.obj", "*.exe", "*.dll",
            "*.so", "*.a", "*.lib", ".vscode", "CMakeFiles", "CMakeCache.txt",
        ],
        _ => vec![],
    }
}

// =============================================================================
// Unified Directory Scanner (WalkBuilder-based)
// =============================================================================

/// Sort comparator: directories first, then case-insensitive alphabetical.
fn sort_file_nodes(nodes: &mut Vec<FileNode>) {
    nodes.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
}

/// Recursively sort all children in a tree of FileNodes.
fn sort_tree_recursive(nodes: &mut Vec<FileNode>) {
    sort_file_nodes(nodes);
    for node in nodes.iter_mut() {
        if let Some(ref mut children) = node.children {
            sort_tree_recursive(children);
        }
    }
}

/// Build a `WalkBuilder` with all ignore/override settings applied.
/// This is the single code path for all directory scanning.
fn build_walker(
    base_path: &Path,
    settings: &IgnoreSettings,
    custom_patterns: &[String],
) -> Result<WalkBuilder, String> {
    let mut builder = WalkBuilder::new(base_path);
    builder
        .hidden(false) // Don't auto-hide hidden files
        .git_ignore(settings.respect_gitignore)
        .git_global(settings.respect_gitignore)
        .git_exclude(settings.respect_gitignore);

    // Add custom ignore file types
    if settings.respect_aiignore {
        builder.add_custom_ignore_filename(".aiignore");
    }
    if settings.respect_dockerignore {
        builder.add_custom_ignore_filename(".dockerignore");
    }

    // Build overrides from SMART_IGNORE, framework patterns, and custom patterns.
    // In the override API, `!pattern` means "exclude/ignore this pattern".
    let mut overrides = OverrideBuilder::new(base_path);

    // Add built-in SMART_IGNORE patterns as exclusions
    for &pattern in SMART_IGNORE {
        overrides.add(&format!("!{}", pattern))
            .map_err(|e| format!("Invalid smart ignore pattern '{}': {}", pattern, e))?;
    }

    // Add framework-specific exclusions
    for framework in &settings.framework_presets {
        for &pattern in &get_framework_patterns(framework) {
            overrides.add(&format!("!{}", pattern))
                .map_err(|e| format!("Invalid framework pattern '{}': {}", pattern, e))?;
        }
    }

    // Add user custom pattern exclusions
    for pattern in custom_patterns {
        let pattern = pattern.trim();
        if !pattern.is_empty() {
            overrides.add(&format!("!{}", pattern))
                .map_err(|e| format!("Invalid custom pattern '{}': {}", pattern, e))?;
        }
    }

    let built_overrides = overrides.build()
        .map_err(|e| format!("Failed to build override patterns: {}", e))?;
    builder.overrides(built_overrides);

    Ok(builder)
}

/// Scan a directory using WalkBuilder and produce a nested FileNode tree.
/// This is the single unified scanner — handles both ignore-file-aware
/// and non-ignore-file modes via the builder configuration.
/// WalkBuilder inherently handles symlink loops by tracking visited inodes.
fn scan_directory(base_path: &Path, builder: &WalkBuilder) -> Option<Vec<FileNode>> {
    use std::collections::BTreeMap;

    // Build a tree structure from walk results
    let mut tree: BTreeMap<String, FileNode> = BTreeMap::new();

    // Clone the builder for iteration
    let walker = builder.clone().build();

    for entry in walker.flatten() {
        let entry_path = entry.path();
        let name = match entry_path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        // Skip the root directory itself
        if entry_path == base_path {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let path_str = entry_path.to_string_lossy().to_string();

        tree.insert(path_str.clone(), FileNode {
            name,
            path: path_str,
            is_dir,
            children: if is_dir { Some(Vec::new()) } else { None },
        });
    }

    // Now rebuild into proper tree structure
    let paths: Vec<String> = tree.keys().cloned().collect();

    // For each entry, find its parent and add as child
    for path_str in &paths {
        let path = Path::new(path_str);
        if let Some(parent) = path.parent() {
            let parent_str = parent.to_string_lossy().to_string();
            if let Some(node) = tree.get(path_str).cloned() {
                if let Some(parent_node) = tree.get_mut(&parent_str) {
                    if let Some(ref mut children) = parent_node.children {
                        children.push(node);
                    }
                }
            }
        }
    }

    // Get direct children of base_path
    let base_str = base_path.to_string_lossy().to_string();
    let mut result: Vec<FileNode> = Vec::new();

    for path_str in &paths {
        let path = Path::new(path_str);
        if let Some(parent) = path.parent() {
            if parent.to_string_lossy().to_string() == base_str {
                if let Some(node) = tree.remove(path_str) {
                    result.push(node);
                }
            }
        }
    }

    // Sort the entire tree recursively
    sort_tree_recursive(&mut result);

    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

// =============================================================================
// File Tree Command
// =============================================================================

#[tauri::command]
fn get_file_tree(
    base_path: String,
    custom_ignore_patterns: Option<Vec<String>>,
    ignore_settings: Option<IgnoreSettings>,
    allowed_scope: tauri::State<'_, AllowedScope>,
) -> Result<FileNode, String> {
    let path = Path::new(&base_path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Canonicalize to resolve symlinks and `..` components, then set the allowed scope
    let canonical_path = path.canonicalize()
        .map_err(|e| format!("Cannot resolve path: {}", e))?;
    allowed_scope.0.lock().unwrap().replace(canonical_path);

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| base_path.clone());

    let settings = ignore_settings.unwrap_or_default();
    let mut patterns = custom_ignore_patterns.unwrap_or_default();

    // Add custom patterns from settings
    patterns.extend(settings.custom_patterns.clone());

    // Build the unified walker with all settings applied
    let builder = build_walker(path, &settings, &patterns)?;

    // Scan using the single unified scanner
    let children = scan_directory(path, &builder);

    Ok(FileNode {
        name,
        path: base_path,
        is_dir: true,
        children,
    })
}

// =============================================================================
// File Content Helpers
// =============================================================================

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Check if a file is likely binary by reading only the first 8KB into a
/// fixed-size buffer. This avoids loading multi-gigabyte files into memory.
fn is_binary_file(path: &Path) -> bool {
    use std::io::Read;
    if let Ok(mut file) = fs::File::open(path) {
        let mut buffer = [0u8; 8192];
        match file.read(&mut buffer) {
            Ok(n) => buffer[..n].contains(&0),
            Err(_) => false,
        }
    } else {
        false
    }
}

/// Format file size in human-readable format
fn format_file_size(bytes: u64) -> String {
    if bytes >= 1024 * 1024 {
        format!("{:.1}MB", bytes as f64 / (1024.0 * 1024.0))
    } else if bytes >= 1024 {
        format!("{:.1}KB", bytes as f64 / 1024.0)
    } else {
        format!("{}B", bytes)
    }
}

// =============================================================================
// File Content Reading Command
// =============================================================================

/// Read contents of multiple files, returning a map of path -> content.
/// Binary files and files exceeding max size are returned with a placeholder.
/// All requested paths are validated against the AllowedScope to prevent
/// path traversal attacks (e.g., reading /etc/passwd via IPC).
/// max_file_size_kb: Maximum file size in KB (optional, defaults to 1024 KB = 1MB)
#[tauri::command]
fn read_files_contents(
    file_paths: Vec<String>,
    max_file_size_kb: Option<u64>,
    allowed_scope: tauri::State<'_, AllowedScope>,
) -> Result<HashMap<String, String>, String> {
    let max_size = max_file_size_kb.map(|kb| kb * 1024).unwrap_or(DEFAULT_MAX_FILE_SIZE);

    // Validate all paths against the allowed scope before reading any files
    {
        let scope_guard = allowed_scope.0.lock().unwrap();
        let root = scope_guard.as_ref()
            .ok_or_else(|| "No directory has been opened yet. Open a folder first.".to_string())?;

        for file_path in &file_paths {
            let path = Path::new(file_path);
            // Canonicalize to resolve symlinks and `..` — defeats traversal
            let canonical = path.canonicalize()
                .map_err(|e| format!("Cannot resolve path '{}': {}", file_path, e))?;
            if !canonical.starts_with(root) {
                return Err(format!(
                    "Access denied: '{}' is outside the allowed scope",
                    file_path
                ));
            }
        }
    }

    let mut contents: HashMap<String, String> = HashMap::new();

    for file_path in file_paths {
        let path = Path::new(&file_path);

        // Check if file exists
        if !path.exists() {
            contents.insert(file_path.clone(), "[File not found - may have been deleted or moved]".to_string());
            continue;
        }

        // Skip directories
        if !path.is_file() {
            continue;
        }

        // Check file size before reading (with error handling for permission issues)
        match fs::metadata(path) {
            Ok(metadata) => {
                let file_size = metadata.len();
                if file_size > max_size {
                    let size_str = format_file_size(file_size);
                    let max_str = format_file_size(max_size);
                    contents.insert(file_path.clone(), format!("[File too large to include - {} (max: {})]", size_str, max_str));
                    continue;
                }
            }
            Err(e) => {
                contents.insert(file_path.clone(), format!("[Cannot access file metadata: {}]", e));
                continue;
            }
        }

        // Check if binary file (now reads only 8KB, not the entire file)
        if is_binary_file(path) {
            contents.insert(file_path.clone(), "[Binary File]".to_string());
            continue;
        }

        // Read file contents with comprehensive error handling
        match fs::read_to_string(path) {
            Ok(content) => {
                contents.insert(file_path.clone(), content);
            }
            Err(e) => {
                // Provide specific error messages for common issues
                let error_msg = match e.kind() {
                    std::io::ErrorKind::NotFound => "[File not found - may have been deleted while scanning]".to_string(),
                    std::io::ErrorKind::PermissionDenied => "[Permission denied - cannot read this file]".to_string(),
                    std::io::ErrorKind::InvalidData => "[File contains invalid UTF-8 encoding]".to_string(),
                    std::io::ErrorKind::Interrupted => "[File read was interrupted - please try again]".to_string(),
                    _ => format!("[Error reading file: {}]", e),
                };
                contents.insert(file_path.clone(), error_msg);
            }
        }
    }

    Ok(contents)
}

// =============================================================================
// App Entry Point
// =============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AllowedScope(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![greet, get_file_tree, read_files_contents])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
