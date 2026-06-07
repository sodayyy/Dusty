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

export interface UninstallResult {
  success: boolean;
  exit_code: number | null;
  stdout: string;
  stderr: string;
}

export async function runUninstaller(
  uninstallString: string,
  silent: boolean
): Promise<UninstallResult> {
  return invoke<UninstallResult>("run_uninstaller", {
    uninstallString,
    silent,
  });
}

export interface ResidueItem {
  path: string;
  category: string;
  description: string;
  safety: "safe" | "caution" | "never";
  size_kb: number;
}

export interface ResidueScanResult {
  software_name: string;
  items: ResidueItem[];
  total_items: number;
  total_size_kb: number;
  registry_count: number;
  file_count: number;
  system_count: number;
}

export async function scanResidues(
  softwareName: string,
  installLocation: string
): Promise<ResidueScanResult> {
  return invoke<ResidueScanResult>("scan_residues", {
    softwareName,
    installLocation,
  });
}

export interface StagingItem {
  path: string;
  category: string;
  safety: string;
}

export interface StagedInfo {
  id: string;
  software_name: string;
  item_count: number;
  created_at: string;
}

export async function moveToStaging(
  items: StagingItem[],
  softwareName: string
): Promise<string> {
  return invoke<string>("move_to_staging", { items, softwareName });
}

export async function listStaged(): Promise<StagedInfo[]> {
  return invoke<StagedInfo[]>("list_staged");
}

export async function restoreFromStaging(stagingId: string): Promise<void> {
  return invoke("restore_from_staging", { stagingId });
}

export async function emptyTrash(stagingId: string): Promise<void> {
  return invoke("empty_trash", { stagingId });
}

export async function checkInterrupted(): Promise<string | null> {
  return invoke<string | null>("check_interrupted");
}