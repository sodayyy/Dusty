use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct LargeFileInfo {
    pub path: String,
    pub name: String,
    pub size_kb: u64,
    pub category: String,
}

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

pub(crate) fn real_dir_size_kb(path: &Path, large_files: &mut Vec<LargeFileInfo>) -> u64 {
    use std::collections::{HashSet, VecDeque};

    let mut total_bytes: u64 = 0;
    let mut visited: HashSet<String> = HashSet::new();
    let mut queue: VecDeque<std::path::PathBuf> = VecDeque::new();
    let mut file_count: u64 = 0;
    const MAX_FILES: u64 = 200_000;
    const MAX_DIRS: usize = 50_000;

    queue.push_back(path.to_path_buf());

    while let Some(current) = queue.pop_front() {
        let key = current.to_string_lossy().to_lowercase();
        if !visited.insert(key) {
            continue;
        }
        if visited.len() > MAX_DIRS {
            break;
        }

        let entries = match std::fs::read_dir(&current) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            if metadata.is_file() {
                let file_size = metadata.len();
                total_bytes += file_size;
                file_count += 1;
                if file_size > 100 * 1024 * 1024 {
                    let file_path = entry_path.to_string_lossy().to_string();
                    let file_name = entry_path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| file_path.clone());
                    large_files.push(LargeFileInfo {
                        path: file_path,
                        name: file_name,
                        size_kb: file_size / 1024,
                        category: String::new(),
                    });
                }
                if file_count >= MAX_FILES {
                    return total_bytes / 1024;
                }
            } else if metadata.is_dir() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if matches!(
                    name.as_str(),
                    "all users"
                        | "documents and settings"
                        | "application data"
                        | "local settings"
                        | "my documents"
                        | "nethood"
                        | "printhood"
                        | "recent"
                        | "sendto"
                        | "start menu"
                        | "templates"
                        | "cookies"
                        | "$recycle.bin"
                        | "system volume information"
                        | "recovery"
                        | "perflogs"
                ) {
                    continue;
                }
                queue.push_back(entry_path);
            }
        }
    }

    total_bytes / 1024
}

/// Scan one level, using real_dir_size_kb for each subdirectory
fn scan_directory(path: &Path, _max_depth: u32, large_files: &mut Vec<LargeFileInfo>) -> DiskItem {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let mut total_kb: u64 = 0;
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
            let entry_name = entry.file_name().to_string_lossy().to_lowercase();
            if matches!(
                entry_name.as_str(),
                "all users"
                    | "documents and settings"
                    | "application data"
                    | "$recycle.bin"
                    | "system volume information"
                    | "recovery"
                    | "perflogs"
                    | "msocache"
                    | "intel"
                    | "amd"
                    | "nvidia"
            ) {
                continue;
            }
            dir_count += 1;
            let size_kb = real_dir_size_kb(&entry_path, large_files);
            total_kb += size_kb;
            let child_name = entry.file_name().to_string_lossy().to_string();
            children.push(DiskItem {
                path: entry_path.to_string_lossy().into_owned(),
                name: child_name,
                size_kb,
                file_count: 0,
                dir_count: 0,
                children: vec![],
            });
            file_count += 1;
        } else if metadata.is_file() {
            let size = metadata.len() / 1024;
            total_kb += size;
            file_count += 1;
        }
    }

    children.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));

    DiskItem {
        path: path.to_string_lossy().into_owned(),
        name,
        size_kb: total_kb,
        file_count,
        dir_count,
        children,
    }
}

fn scan_disk_inner(paths: &[String], large_files: &mut Vec<LargeFileInfo>) -> ScanResult {
    let mut all_items = Vec::new();
    let mut total_size: u64 = 0;
    let mut total_files: u64 = 0;
    let root_path = if paths.len() == 1 {
        paths[0].clone()
    } else {
        "Multiple paths".into()
    };

    for path_str in paths {
        let path = Path::new(path_str);
        if !path.exists() {
            continue;
        }
        let item = scan_directory(path, 0, large_files);
        total_size += item.size_kb;
        total_files += item.file_count;
        all_items.push(item);
    }

    all_items.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));

    ScanResult {
        root_path,
        total_size_kb: total_size,
        total_files,
        items: all_items,
    }
}

#[tauri::command]
pub fn scan_disk(paths: Vec<String>) -> Result<ScanResult, String> {
    Ok(scan_disk_inner(&paths, &mut Vec::new()))
}

/// Scan a single path and return its DiskItem directly
#[tauri::command]
pub fn scan_single_path(path_str: &str) -> Result<DiskItem, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path_str));
    }
    Ok(scan_directory(path, 0, &mut Vec::new()))
}

/// Get default scan paths for disk analysis
#[tauri::command]
pub fn get_default_scan_paths() -> Vec<String> {
    let mut paths = Vec::new();
    let vars = [
        "USERPROFILE",
        "ProgramFiles",
        "ProgramFiles(x86)",
        "APPDATA",
        "LOCALAPPDATA",
        "PROGRAMDATA",
    ];
    for var in &vars {
        if let Ok(p) = std::env::var(var) {
            let path = std::path::Path::new(&p);
            if path.exists() {
                paths.push(p);
            }
        }
    }
    paths
}

/// Scan + classify in one call. Returns category summaries for pie chart.
#[tauri::command]
pub fn scan_classified(paths: Vec<String>) -> Result<crate::classifier::CategorySummaryList, String> {
    eprintln!("[scan_classified] paths: {:?}", paths);

    let mut raw_large_files: Vec<LargeFileInfo> = Vec::new();
    let scan = scan_disk_inner(&paths, &mut raw_large_files);

    let mut leaf_items: Vec<DiskItem> = Vec::new();
    for root_item in &scan.items {
        if root_item.children.is_empty() {
            leaf_items.push(root_item.clone());
        } else {
            leaf_items.extend(root_item.children.clone());
        }
    }

    let classified = crate::classifier::classify_disk_items(&leaf_items);
    let summaries = crate::classifier::group_by_category(&classified);
    let total_size_kb: u64 = summaries.iter().map(|s| s.total_size_kb).sum();

    let mut large_files: Vec<LargeFileInfo> = raw_large_files
        .into_iter()
        .map(|mut f| {
            let cat = crate::classifier::classify_path(&f.path);
            f.category = cat.as_str().to_string();
            f
        })
        .filter(|f| f.category != "software" && f.category != "system")
        .collect();

    large_files.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));
    large_files.truncate(200);

    Ok(crate::classifier::CategorySummaryList {
        summaries,
        total_size_kb,
        total_files: scan.total_files,
        scanned_paths: paths,
        large_files,
    })
}

#[tauri::command]
pub fn get_available_drives() -> Vec<String> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        if std::path::Path::new(&drive).exists() {
            drives.push(drive);
        }
    }
    drives
}
