use serde::{Deserialize, Serialize};
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

fn should_ignore(name: &str) -> bool {
    SMART_IGNORE.iter().any(|&ignored| {
        if ignored.starts_with("*.") {
            // Handle wildcard patterns like "*.pyc"
            let ext = &ignored[1..];
            name.ends_with(ext)
        } else {
            name == ignored
        }
    })
}

fn scan_directory(path: &Path) -> Option<Vec<FileNode>> {
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
        if should_ignore(&name) {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let path_str = entry_path.to_string_lossy().to_string();

        let children = if is_dir {
            scan_directory(&entry_path)
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
fn get_file_tree(base_path: String) -> Result<FileNode, String> {
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

    let children = scan_directory(path);

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, get_file_tree])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
