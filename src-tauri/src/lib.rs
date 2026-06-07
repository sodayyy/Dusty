mod app_list;
mod registry;
mod residue;
mod staging;
mod uninstaller;
use app_list::get_installed_apps;
use residue::scan_residues;
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
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            run_uninstaller,
            scan_residues,
            move_to_staging,
            list_staged,
            restore_from_staging,
            empty_trash,
            check_interrupted
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
