use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct DiskItem {
    pub path: String,
    pub name: String,
    pub size_kb: u64,
    pub file_count: u64,
    pub dir_count: u64,
    pub children: Vec<DiskItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub root_path: String,
    pub total_size_kb: u64,
    pub total_files: u64,
    pub items: Vec<DiskItem>,
}

/// Scan a directory non-recursively (1 level deep), returning child sizes
fn scan_directory(path: &Path, max_depth: u32) -> DiskItem {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let mut total_size: u64 = 0;
    let mut file_count: u64 = 0;
    let mut dir_count: u64 = 0;
    let mut children: Vec<DiskItem> = Vec::new();

    let entries = match std::fs::read_dir(path) {
        Ok(e) => e,
        Err(_) => {
            return DiskItem {
                path: path.to_string_lossy().into_owned(),
                name,
                size_kb: 0,
                file_count: 0,
                dir_count: 0,
                children: vec![],
            };
        }
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            dir_count += 1;
            if max_depth > 0 {
                let child = scan_directory(&entry_path, max_depth - 1);
                total_size += child.size_kb;
                file_count += child.file_count;
                dir_count += child.dir_count;
                children.push(child);
            }
        } else if metadata.is_file() {
            let size = metadata.len();
            total_size += size;
            file_count += 1;
        }
    }

    // Sort children by size descending
    children.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));

    // Add individual files as leaf items if we have files at this level
    // and add them to the total

    DiskItem {
        path: path.to_string_lossy().into_owned(),
        name,
        size_kb: total_size / 1024,
        file_count,
        dir_count,
        children,
    }
}

#[tauri::command]
pub fn scan_disk(paths: Vec<String>) -> Result<ScanResult, String> {
    let mut all_items = Vec::new();
    let mut total_size: u64 = 0;
    let mut total_files: u64 = 0;
    let root_path = if paths.len() == 1 {
        paths[0].clone()
    } else {
        "Multiple paths".into()
    };

    for path_str in &paths {
        let path = Path::new(path_str);
        if !path.exists() {
            continue;
        }
        // Scan 2 levels deep for immediate children
        let item = scan_directory(path, 2);
        total_size += item.size_kb;
        total_files += item.file_count;
        all_items.push(item);
    }

    // Sort items by size descending
    all_items.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));

    Ok(ScanResult {
        root_path,
        total_size_kb: total_size,
        total_files,
        items: all_items,
    })
}

/// Scan a single path and return its DiskItem directly
#[tauri::command]
pub fn scan_single_path(path_str: &str) -> Result<DiskItem, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path_str));
    }
    Ok(scan_directory(path, 2))
}

/// Get default scan paths for disk analysis
#[tauri::command]
pub fn get_default_scan_paths() -> Vec<String> {
    let mut paths = Vec::new();
    if let Ok(home) = std::env::var("USERPROFILE") {
        paths.push(home);
    }
    if let Ok(program_files) = std::env::var("ProgramFiles") {
        paths.push(program_files);
    }
    paths
}

/// Scan + classify in one call. Returns category summaries for pie chart.
#[tauri::command]
pub fn scan_classified(paths: Vec<String>) -> Result<crate::classifier::CategorySummaryList, String> {
    let scan = scan_disk(paths)?;
    let classified = crate::classifier::classify_disk_items(&scan.items);
    let summaries = crate::classifier::group_by_category(&classified);
    Ok(crate::classifier::CategorySummaryList {
        summaries,
        total_size_kb: scan.total_size_kb,
        total_files: scan.total_files,
    })
}
