use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// File tree node structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
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

// Max file size for reading (1MB default)
const MAX_FILE_SIZE: u64 = 1024 * 1024; // 1MB

fn should_ignore(name: &str, custom_patterns: &[String]) -> bool {
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

fn scan_directory(path: &Path, custom_patterns: &[String]) -> Option<Vec<FileNode>> {
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
        if should_ignore(&name, custom_patterns) {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let path_str = entry_path.to_string_lossy().to_string();

        let children = if is_dir {
            scan_directory(&entry_path, custom_patterns)
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

#[tauri::command]
fn get_file_tree(base_path: String, custom_ignore_patterns: Option<Vec<String>>) -> Result<FileNode, String> {
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

    let patterns = custom_ignore_patterns.unwrap_or_default();
    let children = scan_directory(path, &patterns);

    Ok(FileNode {
        name,
        path: base_path,
        is_dir: true,
        children,
    })
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
#[tauri::command]
fn read_files_contents(file_paths: Vec<String>) -> Result<HashMap<String, String>, String> {
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
            if file_size > MAX_FILE_SIZE {
                let size_str = format_file_size(file_size);
                contents.insert(file_path, format!("[File too large to include - {}]", size_str));
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
