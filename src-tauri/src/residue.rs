use crate::registry;
use serde::Serialize;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct ResidueItem {
    pub path: String,
    pub category: String,
    pub description: String,
    pub safety: String,
    pub size_kb: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResidueScanResult {
    pub software_name: String,
    pub items: Vec<ResidueItem>,
    pub total_items: usize,
    pub total_size_kb: u64,
    pub registry_count: usize,
    pub file_count: usize,
    pub system_count: usize,
}

fn search_keywords(name: &str) -> Vec<String> {
    let mut keywords: Vec<String> = name
        .split_whitespace()
        .filter(|w| w.len() >= 3)
        .map(|w| w.to_lowercase())
        .collect();
    // Always include the full name
    let full = name.to_lowercase();
    if !keywords.contains(&full) {
        keywords.push(full);
    }
    keywords
}

fn get_app_data_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(roaming) = std::env::var("APPDATA") {
        dirs.push(PathBuf::from(&roaming));
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        dirs.push(PathBuf::from(&local));
    }
    if let Ok(program_data) = std::env::var("PROGRAMDATA") {
        dirs.push(PathBuf::from(&program_data));
    }
    if let Ok(temp) = std::env::var("TEMP") {
        dirs.push(PathBuf::from(&temp));
    }
    // Program Files
    if let Ok(program_files) = std::env::var("ProgramFiles") {
        dirs.push(PathBuf::from(&program_files));
    }
    if let Ok(pf_x86) = std::env::var("ProgramFiles(x86)") {
        dirs.push(PathBuf::from(&pf_x86));
    }
    dirs
}

fn scan_filesystem(keywords: &[String], install_location: &str) -> Vec<ResidueItem> {
    let mut items = Vec::new();
    let dirs = get_app_data_dirs();

    for base_dir in &dirs {
        // Only scan one level deep for performance
        let top_entries = match std::fs::read_dir(base_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in top_entries.filter_map(|e| e.ok()) {
            let entry_name = entry.file_name().to_string_lossy().to_lowercase();
            let matches = keywords
                .iter()
                .any(|kw| entry_name.contains(kw));
            if !matches {
                continue;
            }

            let path = entry.path();
            let size_kb = dir_size_kb(&path);
            let category = classify_file_path(&path);

            // Skip system directories
            if category == "system" {
                continue;
            }

            let safety = file_safety(&path, &category);
            items.push(ResidueItem {
                path: path.to_string_lossy().into_owned(),
                category: category.to_string(),
                description: format!("残留文件夹: {}", entry.file_name().to_string_lossy()),
                safety: safety.to_string(),
                size_kb,
            });
        }
    }

    // Also check install location directly
    if !install_location.is_empty() {
        let install_path = PathBuf::from(install_location);
        if install_path.exists() {
            let size_kb = dir_size_kb(&install_path);
            items.push(ResidueItem {
                path: install_path.to_string_lossy().into_owned(),
                category: "software".to_string(),
                description: "安装目录未清理".to_string(),
                safety: "safe".to_string(),
                size_kb,
            });
        }
    }

    items
}

fn dir_size_kb(path: &std::path::Path) -> u64 {
    if path.is_file() {
        return path.metadata().map(|m| m.len() / 1024).unwrap_or(0);
    }
    let mut total: u64 = 0;
    for entry in WalkDir::new(path).max_depth(4).into_iter().filter_map(|e| e.ok()) {
        if entry.path().is_file() {
            total += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }
    total / 1024
}

fn classify_file_path(path: &std::path::Path) -> &'static str {
    let s = path.to_string_lossy().to_lowercase();
    if s.contains("\\windows\\") || s.contains("\\system32\\") || s.contains("\\syswow64\\") {
        return "system";
    }
    if s.contains("\\temp\\") || s.contains("\\tmp\\") || s.ends_with(".tmp") {
        return "cache";
    }
    if s.contains("\\program files") {
        return "software";
    }
    if s.contains("\\appdata\\") || s.contains("\\programdata\\") {
        return "data";
    }
    if s.ends_with(".exe") || s.ends_with(".msi") || s.ends_with(".iso") {
        return "installer";
    }
    "other"
}

fn file_safety(_path: &std::path::Path, category: &str) -> &'static str {
    match category {
        "system" => "never",
        "cache" => "safe",
        "software" => "caution",
        "data" => "caution",
        _ => "safe",
    }
}

fn scan_registry(keywords: &[String]) -> Vec<ResidueItem> {
    let mut items = Vec::new();
    for kw in keywords {
        let keys = registry::search_related_keys(kw);
        for k in keys {
            items.push(ResidueItem {
                path: format!("{}\\{}", k.hive, k.path),
                category: "registry".to_string(),
                description: format!("注册表残留: {}\\{}", k.hive, k.path),
                safety: "safe".to_string(),
                size_kb: 0,
            });
        }
    }
    // Deduplicate by path
    items.sort_by(|a, b| a.path.cmp(&b.path));
    items.dedup_by(|a, b| a.path == b.path);
    items
}

fn scan_services(keywords: &[String]) -> Vec<ResidueItem> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let services_path = r"SYSTEM\CurrentControlSet\Services";
    let subkeys = registry::enum_subkeys(&hklm, services_path);

    subkeys
        .into_iter()
        .filter(|name| {
            let lower = name.to_lowercase();
            keywords.iter().any(|kw| lower.contains(kw))
        })
        .map(|name| ResidueItem {
            path: format!("HKLM\\{}\\{}", services_path, name),
            category: "service".to_string(),
            description: format!("Windows 服务残留: {}", name),
            safety: "caution".to_string(),
            size_kb: 0,
        })
        .collect()
}

fn scan_startup_entries(keywords: &[String]) -> Vec<ResidueItem> {
    use winreg::enums::*;
    use winreg::RegKey;
    let mut items = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let run_paths = [
        (&hklm, "HKLM", r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"),
        (&hkcu, "HKCU", r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"),
    ];

    for (predef, hive, path) in &run_paths {
        let values = registry::get_values(predef, path);
        for v in values {
            let lower = format!("{} {}", v.name, v.data).to_lowercase();
            if keywords.iter().any(|kw| lower.contains(kw)) {
                items.push(ResidueItem {
                    path: format!("{}\\{}\\{}", hive, path, v.name),
                    category: "startup".to_string(),
                    description: format!("开机启动项残留: {}", v.name),
                    safety: "safe".to_string(),
                    size_kb: 0,
                });
            }
        }
    }
    items
}

#[tauri::command]
pub fn scan_residues(software_name: &str, install_location: &str) -> Result<ResidueScanResult, String> {
    let keywords = search_keywords(software_name);

    // Run scans in parallel (using simple sequential for now, can optimize later with rayon)
    let file_items = scan_filesystem(&keywords, install_location);
    let file_count = file_items.len();

    let reg_items = scan_registry(&keywords);
    let reg_count = reg_items.len();

    let svc_items = scan_services(&keywords);
    let startup_items = scan_startup_entries(&keywords);
    let sys_items: Vec<ResidueItem> = svc_items.into_iter().chain(startup_items).collect();
    let sys_count = sys_items.len();

    let mut all_items: Vec<ResidueItem> = file_items
        .into_iter()
        .chain(reg_items)
        .chain(sys_items)
        .collect();

    let total_items = all_items.len();
    let total_size_kb: u64 = all_items.iter().map(|i| i.size_kb).sum();

    // Sort: never first (most important to see), then caution, then safe
    all_items.sort_by(|a, b| {
        let rank = |s: &str| match s {
            "never" => 0,
            "caution" => 1,
            _ => 2,
        };
        rank(&a.safety).cmp(&rank(&b.safety))
    });

    Ok(ResidueScanResult {
        software_name: software_name.to_string(),
        items: all_items,
        total_items,
        total_size_kb,
        registry_count: reg_count,
        file_count,
        system_count: sys_count,
    })
}
