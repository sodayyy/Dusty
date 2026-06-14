use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum FileCategory {
    Software,
    System,
    Cache,
    Documents,
    Installer,
    Other,
}

impl FileCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileCategory::Software => "software",
            FileCategory::System => "system",
            FileCategory::Cache => "cache",
            FileCategory::Documents => "documents",
            FileCategory::Installer => "installer",
            FileCategory::Other => "other",
        }
    }

    pub fn safety(&self) -> &'static str {
        match self {
            FileCategory::Software => "caution",
            FileCategory::System => "never",
            FileCategory::Cache => "safe",
            FileCategory::Documents => "caution",
            FileCategory::Installer => "safe",
            FileCategory::Other => "caution",
        }
    }

    pub fn label_cn(&self) -> &'static str {
        match self {
            FileCategory::Software => "软件程序",
            FileCategory::System => "系统文件",
            FileCategory::Cache => "缓存/临时",
            FileCategory::Documents => "文档/媒体",
            FileCategory::Installer => "安装包",
            FileCategory::Other => "其他",
        }
    }
}

fn is_system_path(lower: &str) -> bool {
    lower.contains("\\windows\\")
        || lower.contains("\\system32\\")
        || lower.contains("\\syswow64\\")
        || lower.contains("\\winnt\\")
        || lower.contains("\\drivers\\")
        || lower.starts_with("c:\\windows\\")
        || lower.starts_with("c:\\windows")
}

fn is_program_files(lower: &str) -> bool {
    lower.contains("\\program files\\")
        || lower.contains("\\program files (x86)\\")
        || lower.starts_with("c:\\program files")
}

fn is_cache_path(lower: &str) -> bool {
    lower.contains("\\temp\\")
        || lower.contains("\\tmp\\")
        || lower.contains("\\cache\\")
        || lower.contains("\\appdata\\local\\temp\\")
        || lower.ends_with(".tmp")
        || lower.contains("\\recycle.bin\\")
        || lower.contains("\\prefetch\\")
}

fn is_document_ext(ext: &str) -> bool {
    matches!(
        ext,
        "doc" | "docx"
            | "xls"
            | "xlsx"
            | "ppt"
            | "pptx"
            | "pdf"
            | "txt"
            | "md"
            | "rtf"
            | "csv"
            | "jpg"
            | "jpeg"
            | "png"
            | "gif"
            | "bmp"
            | "svg"
            | "mp3"
            | "mp4"
            | "avi"
            | "mkv"
            | "mov"
            | "wav"
            | "flac"
    )
}

fn is_installer_ext(ext: &str) -> bool {
    matches!(ext, "exe" | "msi" | "iso" | "dmg" | "pkg" | "apk")
}

fn is_profile_documents(lower: &str) -> bool {
    lower.contains("\\documents\\")
        || lower.contains("\\desktop\\")
        || lower.contains("\\pictures\\")
        || lower.contains("\\videos\\")
        || lower.contains("\\music\\")
        || lower.contains("\\downloads\\")
        || lower.contains("\\photos\\")
}

fn is_likely_documents_dir(lower: &str) -> bool {
    // User profile directories
    is_profile_documents(lower)
        // Cloud storage
        || lower.contains("\\onedrive\\")
        || lower.contains("\\dropbox\\")
        || lower.contains("\\google drive\\")
        || lower.contains("\\baidunetdisk\\")
        // Chat apps data
        || lower.contains("\\wechat files\\")
        || lower.contains("\\tencent files\\")
}

/// Classify a file or directory path into one of 6 categories
pub fn classify_path(path: &str) -> FileCategory {
    let lower = path.to_lowercase();
    let p = Path::new(path);

    // System files first (highest priority - never delete)
    if is_system_path(&lower) {
        return FileCategory::System;
    }

    // Cache / temp files
    if is_cache_path(&lower) {
        return FileCategory::Cache;
    }

    // If it's a file, classify by extension
    if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_lowercase();
        if is_installer_ext(&ext_lower) {
            // Check if it's in a downloads folder → definitely installer
            if lower.contains("\\downloads\\") || lower.contains("\\download\\") {
                return FileCategory::Installer;
            }
            // If in Program Files → software, not installer package
            if is_program_files(&lower) {
                return FileCategory::Software;
            }
            return FileCategory::Installer;
        }
        if is_document_ext(&ext_lower) {
            return FileCategory::Documents;
        }
    }

    // Directory-based classification
    if is_program_files(&lower) {
        return FileCategory::Software;
    }

    if is_likely_documents_dir(&lower) {
        return FileCategory::Documents;
    }

    // Game directories
    if lower.contains("\\steamapps\\")
        || lower.contains("\\steam\\games")
        || lower.contains("\\games\\")
        || lower.contains("\\game\\")
        || lower.contains("\\riot games\\")
        || lower.contains("\\epic games\\")
        || lower.contains("\\ubisoft game launcher\\")
        || lower.contains("\\origin games\\")
        || lower.contains("\\battle.net\\")
    {
        return FileCategory::Software;
    }

    // AppData / ProgramData app data
    if lower.contains("\\appdata\\roaming\\")
        || lower.contains("\\appdata\\local\\")
        || lower.contains("\\programdata\\")
    {
        return FileCategory::Software;
    }

    // Dev tools
    if lower.contains("\\.cargo\\")
        || lower.contains("\\.rustup\\")
        || lower.contains("\\node_modules\\")
        || lower.contains("\\.npm\\")
        || lower.contains("\\.gradle\\")
        || lower.contains("\\.m2\\")
        || lower.contains("\\jdk\\")
        || lower.contains("\\java\\")
        || lower.contains("\\python\\")
        || lower.contains("\\conda\\")
        || lower.contains("\\anaconda\\")
        || lower.contains("\\miniconda\\")
    {
        return FileCategory::Software;
    }

    // User home standard folders → documents
    if lower.contains("\\users\\")
        && (lower.ends_with("\\contacts")
            || lower.ends_with("\\favorites")
            || lower.ends_with("\\links")
            || lower.ends_with("\\saved games")
            || lower.ends_with("\\searches")
            || lower.ends_with("\\appdata")
            || lower.ends_with("\\3d objects"))
    {
        return FileCategory::Documents;
    }

    // VM directories
    if lower.contains("\\virtualbox vms\\")
        || lower.contains("\\vmware\\")
        || lower.contains("\\hyper-v\\")
        || lower.contains("\\virtual machines\\")
        || lower.ends_with(".vmdk")
        || lower.ends_with(".vhd")
        || lower.ends_with(".vhdx")
    {
        return FileCategory::Software;
    }

    // Dev project directories
    if lower.contains("\\workspace\\")
        || lower.contains("\\projects\\")
        || lower.contains("\\repos\\")
        || lower.contains("\\source\\")
        || lower.contains("\\claudework\\")
        || lower.contains("\\dev\\")
        || lower.contains("\\code\\")
        || lower.contains("\\git\\")
        || lower.contains("\\.git\\")
        || lower.contains("\\github\\")
        || lower.contains("\\gitlab\\")
    {
        return FileCategory::Software;
    }

    // Game platform roots
    if lower.ends_with("\\steam")
        || lower.ends_with("\\steamlibrary")
        || lower.ends_with("\\epic games")
        || lower.ends_with("\\riot games")
        || lower.ends_with("\\gog galaxy")
        || lower.ends_with("\\ubisoft game launcher")
        || lower.ends_with("\\ea games")
        || lower.ends_with("\\origin")
        || lower.ends_with("\\battle.net")
        || lower.ends_with("\\wegame")
        || lower.ends_with("\\tencent games")
        || lower.ends_with("\\netease games")
        || lower.ends_with("\\games")
        || lower.ends_with("\\game")
    {
        return FileCategory::Software;
    }

    // Common tool / SDK roots
    if lower.ends_with("\\nodejs")
        || lower.ends_with("\\python3")
        || lower.ends_with("\\python39")
        || lower.ends_with("\\python310")
        || lower.ends_with("\\python311")
        || lower.ends_with("\\python312")
        || lower.ends_with("\\ruby")
        || lower.ends_with("\\go")
        || lower.ends_with("\\rust")
        || lower.ends_with("\\dotnet")
        || lower.ends_with("\\xampp")
        || lower.ends_with("\\wamp")
        || lower.ends_with("\\laragon")
        || lower.ends_with("\\mysql")
        || lower.ends_with("\\postgresql")
        || lower.ends_with("\\mongodb")
        || lower.ends_with("\\redis")
        || lower.ends_with("\\nginx")
        || lower.ends_with("\\apache")
        || lower.ends_with("\\docker")
        || lower.ends_with("\\android")
        || lower.ends_with("\\android sdk")
        || lower.ends_with("\\sdk")
    {
        return FileCategory::Software;
    }

    // Backup / sync tools
    if lower.contains("\\backup\\")
        || lower.contains("\\backups\\")
        || lower.contains("\\syncthing\\")
        || lower.ends_with("\\backup")
        || lower.ends_with("\\backups")
    {
        return FileCategory::Documents;
    }

    // Root-level directories
    if lower.ends_with("\\users") {
        return FileCategory::Documents;
    }
    if lower.ends_with("\\programdata") {
        return FileCategory::Software;
    }
    if lower.ends_with("\\windows") {
        return FileCategory::System;
    }

    FileCategory::Other
}

#[derive(Debug, Clone, Serialize)]
pub struct ClassifiedItem {
    pub path: String,
    pub category: String,
    pub category_cn: String,
    pub safety: String,
    pub size_kb: u64,
}

/// Classify a list of DiskItems from scanner into categories (non-recursive)
pub fn classify_disk_items(items: &[crate::scanner::DiskItem]) -> Vec<ClassifiedItem> {
    items.iter().map(|item| {
        let cat = classify_path(&item.path);
        ClassifiedItem {
            path: item.path.clone(),
            category: cat.as_str().to_string(),
            category_cn: cat.label_cn().to_string(),
            safety: cat.safety().to_string(),
            size_kb: item.size_kb,
        }
    }).collect()
}

/// Group classified items by category and sum sizes
pub fn group_by_category(items: &[ClassifiedItem]) -> Vec<CategorySummary> {
    use std::collections::HashMap;
    let mut map: HashMap<String, CategorySummary> = HashMap::new();

    for item in items {
        let entry = map.entry(item.category.clone()).or_insert_with(|| {
            let cat = classify_path(&item.path);
            CategorySummary {
                category: item.category.clone(),
                category_cn: cat.label_cn().to_string(),
                total_size_kb: 0,
                item_count: 0,
                safety: cat.safety().to_string(),
            }
        });
        entry.total_size_kb += item.size_kb;
        entry.item_count += 1;
    }

    let mut summaries: Vec<CategorySummary> = map.into_values().collect();
    summaries.sort_by(|a, b| b.total_size_kb.cmp(&a.total_size_kb));
    summaries
}

#[derive(Debug, Clone, Serialize)]
pub struct CategorySummary {
    pub category: String,
    pub category_cn: String,
    pub total_size_kb: u64,
    pub item_count: u64,
    pub safety: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategorySummaryList {
    pub summaries: Vec<CategorySummary>,
    pub total_size_kb: u64,
    pub total_files: u64,
    pub scanned_paths: Vec<String>,
    pub large_files: Vec<crate::scanner::LargeFileInfo>,
}
