use serde::Serialize;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Clone, Serialize)]
pub struct RegKeyInfo {
    pub hive: String,
    pub path: String,
    pub values: Vec<RegValueInfo>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegValueInfo {
    pub name: String,
    pub data: String,
}

/// Enumerate subkey names under a given predef + path
pub fn enum_subkeys(predef: &RegKey, path: &str) -> Vec<String> {
    let key = match predef.open_subkey_with_flags(path, KEY_READ) {
        Ok(k) => k,
        Err(_) => return vec![],
    };
    key.enum_keys().filter_map(|r| r.ok()).collect()
}

/// Check if a registry key exists
pub fn key_exists(predef: &RegKey, path: &str) -> bool {
    predef.open_subkey_with_flags(path, KEY_READ).is_ok()
}

/// Get all values from a key as strings
pub fn get_values(predef: &RegKey, path: &str) -> Vec<RegValueInfo> {
    let key = match predef.open_subkey_with_flags(path, KEY_READ) {
        Ok(k) => k,
        Err(_) => return vec![],
    };
    key.enum_values()
        .filter_map(|r| r.ok())
        .map(|(name, value)| RegValueInfo {
            name,
            data: format!("{:?}", value),
        })
        .collect()
}

/// Delete a registry key (requires KEY_WRITE access, may fail with permission error)
pub fn delete_key(predef: &RegKey, path: &str) -> Result<(), String> {
    let (parent_path, child_name) = match path.rsplit_once('\\') {
        Some(p) => p,
        None => return Err(format!("Cannot delete root-level key: {}", path)),
    };
    let parent = predef
        .open_subkey_with_flags(parent_path, KEY_WRITE | KEY_READ)
        .map_err(|e| format!("Cannot open parent key {}: {}", parent_path, e))?;
    parent
        .delete_subkey(child_name)
        .map_err(|e| format!("Cannot delete {}: {}", path, e))
}

/// Delete a single value from a key
pub fn delete_value(predef: &RegKey, path: &str, value_name: &str) -> Result<(), String> {
    let key = predef
        .open_subkey_with_flags(path, KEY_WRITE | KEY_READ)
        .map_err(|e| format!("Cannot open key {}: {}", path, e))?;
    key.delete_value(value_name)
        .map_err(|e| format!("Cannot delete value {} from {}: {}", value_name, path, e))
}

/// Search for registry keys whose path contains `query` (case-insensitive).
/// Searches HKLM Uninstall, HKLM Software, HKCU Software.
pub fn search_related_keys(software_name: &str) -> Vec<RegKeyInfo> {
    let mut results = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let name_lower = software_name.to_lowercase();

    let search_paths: [(&RegKey, &str); 5] = [
        (&hklm, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hklm, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hkcu, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hklm, r"SOFTWARE"),
        (&hkcu, r"SOFTWARE"),
    ];

    for (predef, base_path) in &search_paths {
        let subkeys = enum_subkeys(predef, base_path);
        for subkey in subkeys {
            if subkey.to_lowercase().contains(&name_lower) {
                let full_path = format!("{}\\{}", base_path, subkey);
                let values = get_values(predef, &full_path);
                let hive_name = if predef.raw_handle() == hklm.raw_handle() {
                    "HKLM"
                } else {
                    "HKCU"
                };
                results.push(RegKeyInfo {
                    hive: hive_name.into(),
                    path: full_path,
                    values,
                });
            }
        }
    }

    results
}
