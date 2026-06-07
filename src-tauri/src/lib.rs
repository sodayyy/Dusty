mod app_list;
mod classifier;
mod registry;
mod residue;
mod scanner;
mod staging;
mod uninstaller;
use app_list::get_installed_apps;
use residue::scan_residues;
use scanner::{get_default_scan_paths, scan_classified, scan_disk, scan_single_path};
use staging::{
    check_interrupted, empty_trash, list_staged, move_to_staging, restore_from_staging,
};
use uninstaller::run_uninstaller;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Clean up expired staging entries on startup
    staging::cleanup_expired();

    // Check for interrupted operations
    if let Ok(Some(sw_name)) = check_interrupted() {
        eprintln!("[Dusty] Interrupted operation detected for: {}", sw_name);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            run_uninstaller,
            scan_residues,
            move_to_staging,
            list_staged,
            restore_from_staging,
            empty_trash,
            check_interrupted,
            scan_disk,
            scan_single_path,
            scan_classified,
            get_default_scan_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
