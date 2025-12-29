use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use ignore::WalkBuilder;

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

// Max file size for reading (1MB default)
const DEFAULT_MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB

fn should_ignore(name: &str, custom_patterns: &[String], framework_patterns: &[&str]) -> bool {
    // Check built-in patterns
    let matches_builtin = SMART_IGNORE.iter().any(|&ignored| {
        if ignored.starts_with("*.") {
            let ext = &ignored[1..];
            name.ends_with(ext)
        } else {
            name == ignored
        }
    });
    
    if matches_builtin {
        return true;
    }
    
    // Check framework-specific patterns
    let matches_framework = framework_patterns.iter().any(|&pattern| {
        if pattern.starts_with("*.") {
            let ext = &pattern[1..];
            name.ends_with(ext)
        } else if pattern.contains('*') {
            let parts: Vec<&str> = pattern.split('*').filter(|s| !s.is_empty()).collect();
            parts.iter().all(|part| name.contains(part))
        } else {
            name == pattern
        }
    });
    
    if matches_framework {
        return true;
    }
    
    // Check custom patterns
    custom_patterns.iter().any(|pattern| {
        let pattern = pattern.trim();
        if pattern.is_empty() {
            return false;
        }
        if pattern.starts_with("*.") {
            // Wildcard extension pattern like "*.log"
            let ext = &pattern[1..];
            name.ends_with(ext)
        } else if pattern.contains('*') {
            // Simple glob pattern - convert to contains check
            let parts: Vec<&str> = pattern.split('*').filter(|s| !s.is_empty()).collect();
            parts.iter().all(|part| name.contains(part))
        } else {
            // Exact match
            name == pattern
        }
    })
}

fn scan_directory(path: &Path, custom_patterns: &[String], framework_patterns: &[&str]) -> Option<Vec<FileNode>> {
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return None, // Handle permission errors gracefully
    };

    let mut nodes: Vec<FileNode> = Vec::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = match entry.file_name().into_string() {
            Ok(n) => n,
            Err(_) => continue, // Skip entries with invalid UTF-8 names
        };

        // Skip ignored files/directories
        if should_ignore(&name, custom_patterns, framework_patterns) {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let path_str = entry_path.to_string_lossy().to_string();

        let children = if is_dir {
            scan_directory(&entry_path, custom_patterns, framework_patterns)
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }

    // Sort: directories first, then alphabetically
    nodes.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Some(nodes)
}

/// Scan directory using the ignore crate for .gitignore/.aiignore support
fn scan_directory_with_ignore(
    base_path: &Path,
    custom_patterns: &[String],
    framework_patterns: &[&str],
    builder: &WalkBuilder,
) -> Option<Vec<FileNode>> {
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
        
        // Skip if matches our custom patterns or framework patterns
        if should_ignore(&name, custom_patterns, framework_patterns) {
            continue;
        }
        
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
                if let Some(mut node) = tree.remove(path_str) {
                    // Sort children if any
                    if let Some(ref mut children) = node.children {
                        children.sort_by(|a, b| {
                            match (a.is_dir, b.is_dir) {
                                (true, false) => std::cmp::Ordering::Less,
                                (false, true) => std::cmp::Ordering::Greater,
                                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                            }
                        });
                    }
                    result.push(node);
                }
            }
        }
    }
    
    // Sort the result
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

#[tauri::command]
fn get_file_tree(
    base_path: String, 
    custom_ignore_patterns: Option<Vec<String>>,
    ignore_settings: Option<IgnoreSettings>,
) -> Result<FileNode, String> {
    let path = Path::new(&base_path);
    
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| base_path.clone());

    let settings = ignore_settings.unwrap_or_default();
    let mut patterns = custom_ignore_patterns.unwrap_or_default();
    
    // Add custom patterns from settings
    patterns.extend(settings.custom_patterns.clone());
    
    // Collect framework patterns
    let mut framework_patterns: Vec<&str> = Vec::new();
    for framework in &settings.framework_presets {
        framework_patterns.extend(get_framework_patterns(framework));
    }
    
    // If respecting ignore files, use the ignore crate to parse them
    if settings.respect_gitignore || settings.respect_dockerignore || settings.respect_aiignore {
        // Build the walker with ignore file support
        let mut builder = WalkBuilder::new(path);
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
        
        // Use a different scanning approach with the ignore crate
        let children = scan_directory_with_ignore(path, &patterns, &framework_patterns, &builder);
        
        Ok(FileNode {
            name,
            path: base_path,
            is_dir: true,
            children,
        })
    } else {
        // Standard scanning without ignore file parsing
        let children = scan_directory(path, &patterns, &framework_patterns);

        Ok(FileNode {
            name,
            path: base_path,
            is_dir: true,
            children,
        })
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Check if a file is likely binary by reading the first 8KB and looking for null bytes
fn is_binary_file(path: &Path) -> bool {
    if let Ok(data) = fs::read(path) {
        // Check the first 8KB for null bytes (common in binary files)
        let check_size = std::cmp::min(8192, data.len());
        data[..check_size].contains(&0)
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

/// Read contents of multiple files, returning a map of path -> content
/// Binary files and files exceeding max size are returned with a placeholder
/// max_file_size_kb: Maximum file size in KB (optional, defaults to 1024 KB = 1MB)
#[tauri::command]
fn read_files_contents(
    file_paths: Vec<String>,
    max_file_size_kb: Option<u64>,
) -> Result<HashMap<String, String>, String> {
    let max_size = max_file_size_kb.map(|kb| kb * 1024).unwrap_or(DEFAULT_MAX_FILE_SIZE);
    let mut contents: HashMap<String, String> = HashMap::new();

    for file_path in file_paths {
        let path = Path::new(&file_path);

        if !path.exists() {
            contents.insert(file_path, "[File not found]".to_string());
            continue;
        }

        if !path.is_file() {
            continue; // Skip directories
        }

        // Check file size before reading
        if let Ok(metadata) = fs::metadata(path) {
            let file_size = metadata.len();
            if file_size > max_size {
                let size_str = format_file_size(file_size);
                let max_str = format_file_size(max_size);
                contents.insert(file_path, format!("[File too large to include - {} (max: {})]", size_str, max_str));
                continue;
            }
        }

        if is_binary_file(path) {
            contents.insert(file_path, "[Binary File]".to_string());
            continue;
        }

        match fs::read_to_string(path) {
            Ok(content) => {
                contents.insert(file_path, content);
            }
            Err(e) => {
                contents.insert(file_path, format!("[Error reading file: {}]", e));
            }
        }
    }

    Ok(contents)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![greet, get_file_tree, read_files_contents])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
