use serde::Serialize;
use std::collections::HashSet;
use winreg::enums::*;
use winreg::RegKey;

fn get_dir_size_kb(path: &str) -> u64 {
    if path.is_empty() {
        return 0;
    }
    let p = std::path::Path::new(path);
    if !p.exists() {
        return 0;
    }
    let mut total: u64 = 0;
    if let Ok(entries) = std::fs::read_dir(p) {
        for entry in entries.filter_map(|e| e.ok()) {
            let ep = entry.path();
            if ep.is_file() {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            } else if ep.is_dir() {
                if let Ok(sub) = std::fs::read_dir(&ep) {
                    for se in sub.filter_map(|e| e.ok()) {
                        if se.path().is_file() {
                            total += se.metadata().map(|m| m.len()).unwrap_or(0);
                        }
                    }
                }
            }
        }
    }
    total / 1024
}

#[derive(Debug, Clone, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub publisher: String,
    pub version: String,
    pub install_date: String,
    pub install_location: String,
    pub uninstall_string: String,
    pub size_kb: u64,
}

fn read_uninstall_key(predef: &RegKey, sub_path: &str) -> Vec<AppInfo> {
    let mut apps = Vec::new();
    let key = match predef.open_subkey_with_flags(sub_path, KEY_READ) {
        Ok(k) => k,
        Err(_) => return apps,
    };

    for name_result in key.enum_keys() {
        let subkey_name = match name_result {
            Ok(n) => n,
            Err(_) => continue,
        };
        let subkey = match key.open_subkey_with_flags(&subkey_name, KEY_READ) {
            Ok(sk) => sk,
            Err(_) => continue,
        };

        let system_component: u32 = subkey.get_value("SystemComponent").unwrap_or(0);
        if system_component == 1 {
            continue;
        }

        let display_name: String = match subkey.get_value("DisplayName") {
            Ok(v) => v,
            Err(_) => continue,
        };
        if display_name.trim().is_empty() {
            continue;
        }

        apps.push(AppInfo {
            name: display_name,
            publisher: subkey.get_value("Publisher").unwrap_or_default(),
            version: subkey.get_value("DisplayVersion").unwrap_or_default(),
            install_date: subkey.get_value("InstallDate").unwrap_or_default(),
            install_location: subkey.get_value("InstallLocation").unwrap_or_default(),
            uninstall_string: subkey.get_value("UninstallString").unwrap_or_default(),
            size_kb: {
                let reg_size = subkey.get_value::<u32, _>("EstimatedSize").map(|v| v as u64).unwrap_or(0);
                if reg_size > 0 {
                    reg_size
                } else {
                    let loc: String = subkey.get_value("InstallLocation").unwrap_or_default();
                    get_dir_size_kb(&loc)
                }
            },
        });
    }

    apps
}

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<AppInfo>, String> {
    let mut all_apps = Vec::new();

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let paths = [
        (&hklm, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hklm, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hkcu, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    for (predef, path) in &paths {
        all_apps.extend(read_uninstall_key(predef, path));
    }

    let mut seen = HashSet::new();
    all_apps.retain(|app| seen.insert(app.name.clone()));
    all_apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(all_apps)
}
