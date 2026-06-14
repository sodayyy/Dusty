import { create } from "zustand";
import {
  getInstalledApps,
  runUninstaller,
  scanResidues,
  verifyUninstalled,
  deleteResidues,
  type AppInfo,
  type UninstallResult,
  type ResidueScanResult,
  type CategorySummaryList,
  type HotspotItem,
  type DeleteSummary,
} from "@/lib/tauri-commands";

type UninstallPhase = "idle" | "uninstalling" | "verifying" | "verify_failed" | "scanning" | "review" | "deleting" | "done";

interface AppState {
  apps: AppInfo[];
  loading: boolean;
  error: string | null;
  selectedApp: AppInfo | null;
  searchQuery: string;

  fetchApps: () => Promise<void>;
  selectApp: (app: AppInfo | null) => void;
  setSearchQuery: (query: string) => void;

  // Uninstall flow
  uninstallPhase: UninstallPhase;
  uninstallResult: UninstallResult | null;
  residues: ResidueScanResult | null;
  selectedResiduePaths: Set<string>;
  deleteResult: DeleteSummary | null;
  flowError: string | null;

  startUninstall: (app: AppInfo) => Promise<void>;
  verifyAndScan: (app: AppInfo) => Promise<void>;
  toggleResidue: (path: string) => void;
  selectAllSafe: () => void;
  deleteSelectedResidues: (softwareName: string) => Promise<void>;
  resetUninstall: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: [],
  loading: false,
  error: null,
  selectedApp: null,
  searchQuery: "",

  fetchApps: async () => {
    set({ loading: true, error: null });
    try {
      const apps = await getInstalledApps();
      set({ apps, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  selectApp: (app) => set({ selectedApp: app }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  // Uninstall flow
  uninstallPhase: "idle",
  uninstallResult: null,
  residues: null,
  selectedResiduePaths: new Set(),
  deleteResult: null,
  flowError: null,

  startUninstall: async (app) => {
    set({ uninstallPhase: "uninstalling", flowError: null, uninstallResult: null });
    try {
      const result = await runUninstaller(app.uninstall_string, true);
      set({ uninstallResult: result, uninstallPhase: "verifying" });
      get().verifyAndScan(app);
    } catch (e) {
      set({ flowError: String(e), uninstallPhase: "idle" });
    }
  },

  verifyAndScan: async (app) => {
    set({ uninstallPhase: "verifying", flowError: null });
    try {
      const success = await verifyUninstalled(
        app.install_location,
        app.name
      );
      if (!success) {
        set({ uninstallPhase: "verify_failed" });
        return;
      }
    } catch (e) {
      set({ flowError: String(e), uninstallPhase: "verify_failed" });
      return;
    }

    set({ uninstallPhase: "scanning" });
    try {
      const residues = await scanResidues(app.name, app.install_location);
      const safePaths = new Set(
        residues.items.filter((r) => r.safety === "safe").map((r) => r.path)
      );
      set({
        residues,
        selectedResiduePaths: safePaths,
        uninstallPhase: "review",
      });
    } catch (e) {
      set({ flowError: String(e), uninstallPhase: "review" });
    }
  },

  toggleResidue: (path) => {
    const next = new Set(get().selectedResiduePaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ selectedResiduePaths: next });
  },

  selectAllSafe: () => {
    const { residues } = get();
    if (!residues) return;
    const safePaths = new Set(
      residues.items.filter((r) => r.safety === "safe").map((r) => r.path)
    );
    set({ selectedResiduePaths: safePaths });
  },

  deleteSelectedResidues: async (_softwareName) => {
    const { residues, selectedResiduePaths } = get();
    if (!residues) {
      set({ uninstallPhase: "done" });
      return;
    }
    set({ uninstallPhase: "deleting" });
    try {
      const toDelete = residues.items
        .filter((r) => selectedResiduePaths.has(r.path))
        .map((r) => ({ path: r.path, category: r.category }));
      if (toDelete.length === 0) {
        set({ uninstallPhase: "done" });
        return;
      }
      const result = await deleteResidues(toDelete);
      set({ deleteResult: result, uninstallPhase: "done" });
    } catch (e) {
      set({ flowError: String(e), uninstallPhase: "review" });
    }
  },

  resetUninstall: () =>
    set({
      uninstallPhase: "idle",
      uninstallResult: null,
      residues: null,
      selectedResiduePaths: new Set(),
      deleteResult: null,
      flowError: null,
      selectedApp: null,
    }),
}));

interface DiskState {
  diskScanCache: Record<string, CategorySummaryList>;
  diskHotspots: HotspotItem[];
  hotspotsFetched: boolean;
  selectedDrive: string | null;
  appTagCache: Record<string, string>;

  setDiskScanCache: (drive: string, data: CategorySummaryList) => void;
  setDiskHotspots: (items: HotspotItem[]) => void;
  setSelectedDrive: (drive: string | null) => void;
  setAppTagCache: (tags: Record<string, string>) => void;
  clearDiskCache: () => void;
}

export const useDiskStore = create<DiskState>((set) => ({
  diskScanCache: {},
  diskHotspots: [],
  hotspotsFetched: false,
  selectedDrive: null,
  appTagCache: {},

  setDiskScanCache: (drive, data) =>
    set((state) => ({
      diskScanCache: { ...state.diskScanCache, [drive]: data },
    })),

  setDiskHotspots: (items) =>
    set({ diskHotspots: items, hotspotsFetched: true }),

  setSelectedDrive: (drive) => set({ selectedDrive: drive }),

  setAppTagCache: (tags) =>
    set((state) => ({
      appTagCache: { ...state.appTagCache, ...tags },
    })),

  clearDiskCache: () =>
    set({
      diskScanCache: {},
      diskHotspots: [],
      hotspotsFetched: false,
      appTagCache: {},
    }),
}));
