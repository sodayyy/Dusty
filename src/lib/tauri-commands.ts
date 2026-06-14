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

// Scanner types
export interface DiskItem {
  path: string;
  name: string;
  size_kb: number;
  file_count: number;
  dir_count: number;
  children: DiskItem[];
}

export interface ScanResult {
  root_path: string;
  total_size_kb: number;
  total_files: number;
  items: DiskItem[];
}

export interface CategorySummary {
  category: string;
  category_cn: string;
  total_size_kb: number;
  item_count: number;
  safety: string;
}

export interface LargeFileInfo {
  path: string;
  name: string;
  size_kb: number;
  category: string;
}

export interface HotspotItem {
  name: string;
  path: string;
  size_kb: number;
  description: string;
  safety: string;
}

export interface CategorySummaryList {
  summaries: CategorySummary[];
  total_size_kb: number;
  total_files: number;
  scanned_paths: string[];
  large_files: LargeFileInfo[];
}

export async function scanDisk(paths: string[]): Promise<ScanResult> {
  return invoke<ScanResult>("scan_disk", { paths });
}

export async function scanSinglePath(pathStr: string): Promise<DiskItem> {
  return invoke<DiskItem>("scan_single_path", { pathStr });
}

export async function getAvailableDrives(): Promise<string[]> {
  return invoke<string[]>("get_available_drives");
}

export async function getDefaultScanPaths(): Promise<string[]> {
  return invoke<string[]>("get_default_scan_paths");
}

export async function scanClassified(
  paths: string[]
): Promise<CategorySummaryList> {
  return invoke<CategorySummaryList>("scan_classified", { paths });
}

export async function detectHotspots(): Promise<HotspotItem[]> {
  return invoke<HotspotItem[]>("detect_hotspots");
}

export interface DeleteItem {
  path: string;
  category: string;
}

export interface DeleteSummary {
  deleted: number;
  failed: number;
  errors: string[];
}

export async function verifyUninstalled(
  installLocation: string,
  softwareName: string
): Promise<boolean> {
  return invoke<boolean>("verify_uninstalled", {
    installLocation,
    softwareName,
  });
}

export async function deleteResidues(
  items: DeleteItem[]
): Promise<DeleteSummary> {
  return invoke<DeleteSummary>("delete_residues", { items });
}