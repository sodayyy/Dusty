use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct HotspotItem {
    pub name: String,
    pub path: String,
    pub size_kb: u64,
    pub description: String,
    pub safety: String,
}

struct HotspotRule {
    name: &'static str,
    path_template: &'static str,
    description: &'static str,
    safety: &'static str,
    shallow: bool,
}

const HOTSPOT_RULES: &[HotspotRule] = &[
    HotspotRule {
        name: "Windows 临时文件",
        path_template: "{UP}\\AppData\\Local\\Temp",
        description: "系统和程序产生的临时文件，可安全清理",
        safety: "safe",
        shallow: true,
    },
    HotspotRule {
        name: "Windows 错误报告",
        path_template: "C:\\ProgramData\\Microsoft\\Windows\\WER",
        description: "Windows 崩溃和错误报告文件",
        safety: "safe",
        shallow: false,
    },
    HotspotRule {
        name: "NVIDIA Shader 缓存",
        path_template: "{UP}\\AppData\\Local\\NVIDIA",
        description: "NVIDIA 显卡着色器缓存，删除后会自动重建",
        safety: "safe",
        shallow: false,
    },
    HotspotRule {
        name: "缩略图缓存",
        path_template: "{UP}\\AppData\\Local\\Microsoft\\Windows\\Explorer",
        description: "Windows 文件夹缩略图缓存，删除后会自动重建",
        safety: "safe",
        shallow: false,
    },
    HotspotRule {
        name: "Windows 更新缓存",
        path_template: "C:\\Windows\\SoftwareDistribution\\Download",
        description: "Windows Update 下载的更新包，更新完成后可清理",
        safety: "safe",
        shallow: false,
    },
    HotspotRule {
        name: "Chrome 缓存",
        path_template: "{UP}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
        description: "Chrome 浏览器网页缓存，可安全清理",
        safety: "safe",
        shallow: false,
    },
    HotspotRule {
        name: "Edge 缓存",
        path_template: "{UP}\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache",
        description: "Edge 浏览器网页缓存，可安全清理",
        safety: "safe",
        shallow: false,
    },
];

fn shallow_dir_size_kb(path: &Path) -> u64 {
    let mut total: u64 = 0;
    let entries = match std::fs::read_dir(path) {
        Ok(e) => e,
        Err(_) => return 0,
    };
    for entry in entries.filter_map(|e| e.ok()) {
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                total += meta.len();
            }
        }
    }
    total / 1024
}

#[tauri::command]
pub fn detect_hotspots() -> Vec<HotspotItem> {
    let userprofile = match std::env::var("USERPROFILE") {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let mut results = Vec::new();

    for rule in HOTSPOT_RULES {
        let path_str = rule.path_template.replace("{UP}", &userprofile);
        let path = Path::new(&path_str);

        if !path.exists() {
            continue;
        }

        let size_kb = if rule.shallow {
            shallow_dir_size_kb(path)
        } else {
            crate::scanner::real_dir_size_kb(path, &mut Vec::new())
        };

        if size_kb == 0 {
            continue;
        }

        results.push(HotspotItem {
            name: rule.name.to_string(),
            path: path_str,
            size_kb,
            description: rule.description.to_string(),
            safety: rule.safety.to_string(),
        });
    }

    results.sort_by(|a, b| b.size_kb.cmp(&a.size_kb));
    results
}
