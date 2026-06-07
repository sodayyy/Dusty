import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  publisher: string;
  version: string;
  install_date: string;
  install_location: string;
  uninstall_string: string;
  size_kb: number;
}

export async function getInstalledApps(): Promise<AppInfo[]> {
  return invoke<AppInfo[]>("get_installed_apps");
}