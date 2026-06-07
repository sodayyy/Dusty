use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaEntry {
    pub original_path: String,
    pub staged_at: String,
    pub category: String,
    pub safety: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StagingMeta {
    pub software_name: String,
    pub created_at: String,
    pub expires_at: String,
    pub items: Vec<MetaEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StagedInfo {
    pub id: String,
    pub software_name: String,
    pub item_count: usize,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackEntry {
    pub action: String,
    pub target: String,
    pub status: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackLog {
    pub operation: String,
    pub software_name: String,
    pub started_at: String,
    pub status: String,
    pub steps: Vec<RollbackEntry>,
}

fn staging_dir() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    PathBuf::from(&appdata).join("Dusty").join("staging")
}

fn now_iso() -> String {
    chrono_now().unwrap_or_else(|| "unknown".into())
}

fn chrono_now() -> Option<String> {
    let now = std::time::SystemTime::now();
    let dt = now.duration_since(std::time::UNIX_EPOCH).ok()?;
    Some(format!("{}", dt.as_secs()))
}

fn expiry_timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() + 7 * 24 * 3600)
        .unwrap_or(0);
    format!("{}", secs)
}

#[tauri::command]
pub fn move_to_staging(
    items: Vec<StagingItem>,
    software_name: &str,
) -> Result<String, String> {
    let base = staging_dir();
    fs::create_dir_all(&base).map_err(|e| format!("Cannot create staging dir: {}", e))?;

    let ts = now_iso();
    let dir_name = format!("{}-{}", ts, sanitize_filename(software_name));
    let stage_path = base.join(&dir_name);
    fs::create_dir_all(&stage_path).map_err(|e| format!("Cannot create stage dir: {}", e))?;

    let mut meta_items = Vec::new();
    let mut rollback_steps = Vec::new();

    // Write rollback log BEFORE moving files
    let rollback = RollbackLog {
        operation: "move_to_staging".into(),
        software_name: software_name.to_string(),
        started_at: now_iso(),
        status: "in_progress".into(),
        steps: vec![],
    };
    let rollback_path = stage_path.join("rollback.json");
    write_json(&rollback_path, &rollback)?;

    for (i, item) in items.iter().enumerate() {
        let src = PathBuf::from(&item.path);
        let file_name = src.file_name().map(|f| f.to_string_lossy().to_string()).unwrap_or_else(|| format!("item_{}", i));
        let dest = stage_path.join(&file_name);

        if src.is_file() || src.is_dir() {
            if let Err(e) = fs::rename(&src, &dest) {
                // Cross-device or permission error — log and skip
                eprintln!("[Dusty] Cannot move {} to staging: {}", item.path, e);
                continue;
            }
        }

        meta_items.push(MetaEntry {
            original_path: item.path.clone(),
            staged_at: now_iso(),
            category: item.category.clone(),
            safety: item.safety.clone(),
        });

        rollback_steps.push(RollbackEntry {
            action: "move".into(),
            target: item.path.clone(),
            status: "done".into(),
            timestamp: now_iso(),
        });
    }

    // Write meta.json
    let meta = StagingMeta {
        software_name: software_name.to_string(),
        created_at: now_iso(),
        expires_at: expiry_timestamp(),
        items: meta_items,
    };
    let meta_path = stage_path.join("meta.json");
    write_json(&meta_path, &meta)?;

    // Update rollback with completed status
    let rollback = RollbackLog {
        operation: "move_to_staging".into(),
        software_name: software_name.to_string(),
        started_at: now_iso(),
        status: "completed".into(),
        steps: rollback_steps,
    };
    write_json(&rollback_path, &rollback)?;

    Ok(dir_name)
}

#[tauri::command]
pub fn list_staged() -> Result<Vec<StagedInfo>, String> {
    let base = staging_dir();
    if !base.exists() {
        return Ok(vec![]);
    }

    let mut result = Vec::new();
    let entries = fs::read_dir(&base).map_err(|e| format!("Cannot read staging: {}", e))?;
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let meta_path = path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }
        let meta: StagingMeta = read_json(&meta_path)?;
        result.push(StagedInfo {
            id: path.file_name().unwrap().to_string_lossy().into_owned(),
            software_name: meta.software_name,
            item_count: meta.items.len(),
            created_at: meta.created_at,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn restore_from_staging(staging_id: &str) -> Result<(), String> {
    let stage_path = staging_dir().join(staging_id);
    if !stage_path.exists() {
        return Err("Staging entry not found".into());
    }

    let meta_path = stage_path.join("meta.json");
    let meta: StagingMeta = read_json(&meta_path)?;

    for item in &meta.items {
        let file_name = PathBuf::from(&item.original_path)
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_default();
        let src = stage_path.join(&file_name);
        let dest = PathBuf::from(&item.original_path);

        if src.exists() {
            if let Some(parent) = dest.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let _ = fs::rename(&src, &dest);
        }
    }

    // Clean up staging dir after successful restore
    let _ = fs::remove_dir_all(&stage_path);
    Ok(())
}

#[tauri::command]
pub fn empty_trash(staging_id: &str) -> Result<(), String> {
    let stage_path = staging_dir().join(staging_id);
    if !stage_path.exists() {
        return Err("Staging entry not found".into());
    }

    let meta_path = stage_path.join("meta.json");
    let meta: StagingMeta = read_json(&meta_path)?;

    // Write final rollback before permanent delete
    let rollback_path = stage_path.join("rollback.json");
    let rollback = RollbackLog {
        operation: "empty_trash".into(),
        software_name: meta.software_name.clone(),
        started_at: now_iso(),
        status: "completed".into(),
        steps: meta
            .items
            .iter()
            .map(|item| RollbackEntry {
                action: "permanent_delete".into(),
                target: item.original_path.clone(),
                status: "done".into(),
                timestamp: now_iso(),
            })
            .collect(),
    };
    write_json(&rollback_path, &rollback)?;

    // Permanently delete staging directory
    fs::remove_dir_all(&stage_path).map_err(|e| format!("Cannot delete staging: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn check_interrupted() -> Result<Option<String>, String> {
    let base = staging_dir();
    if !base.exists() {
        return Ok(None);
    }

    let entries = fs::read_dir(&base).map_err(|e| format!("Cannot read staging: {}", e))?;
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let rollback_path = path.join("rollback.json");
        if !rollback_path.exists() {
            continue;
        }
        let log: RollbackLog = read_json(&rollback_path)?;
        if log.status == "in_progress" {
            return Ok(Some(log.software_name));
        }
    }
    Ok(None)
}

/// Clean up expired staging entries (call on app startup)
pub fn cleanup_expired() {
    let base = staging_dir();
    if !base.exists() {
        return;
    }
    let entries = match fs::read_dir(&base) {
        Ok(e) => e,
        Err(_) => return,
    };
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let meta_path = path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }
        let meta: StagingMeta = match read_json(&meta_path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let expires: u64 = meta.expires_at.parse().unwrap_or(0);
        if expires > 0 && now_secs > expires {
            let _ = fs::remove_dir_all(&path);
        }
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

fn write_json<T: Serialize>(path: &PathBuf, value: &T) -> Result<(), String> {
    let json = serde_json::to_string_pretty(value).map_err(|e| format!("JSON: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Write: {}", e))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T, String> {
    let data = fs::read_to_string(path).map_err(|e| format!("Read: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Parse: {}", e))
}

/// Input type for move_to_staging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StagingItem {
    pub path: String,
    pub category: String,
    pub safety: String,
}
