import { create } from "zustand";
import {
  getInstalledApps,
  runUninstaller,
  scanResidues,
  moveToStaging,
  type AppInfo,
  type UninstallResult,
  type ResidueScanResult,
} from "@/lib/tauri-commands";

type UninstallPhase = "idle" | "uninstalling" | "scanning" | "review" | "staging" | "done";

interface AppState {
  apps: AppInfo[];
  loading: boolean;
  error: string | null;
  selectedApp: AppInfo | null;
  searchQuery: string;

  fetchApps: () => Promise<void>;
  selectApp: (app: AppInfo | null) => void;
  setSearchQuery: (query: string) => void;
  filteredApps: () => AppInfo[];

  // Uninstall flow
  uninstallPhase: UninstallPhase;
  uninstallResult: UninstallResult | null;
  residues: ResidueScanResult | null;
  selectedResiduePaths: Set<string>;
  stagedId: string | null;
  flowError: string | null;

  startUninstall: (app: AppInfo) => Promise<void>;
  scanAfterUninstall: (app: AppInfo) => Promise<void>;
  toggleResidue: (path: string) => void;
  selectAllSafe: () => void;
  moveSelectedToStaging: (softwareName: string) => Promise<void>;
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

  filteredApps: () => {
    const { apps, searchQuery } = get();
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.publisher.toLowerCase().includes(q)
    );
  },

  // Uninstall flow
  uninstallPhase: "idle",
  uninstallResult: null,
  residues: null,
  selectedResiduePaths: new Set(),
  stagedId: null,
  flowError: null,

  startUninstall: async (app) => {
    set({ uninstallPhase: "uninstalling", flowError: null, uninstallResult: null });
    try {
      const result = await runUninstaller(app.uninstall_string, true);
      set({ uninstallResult: result, uninstallPhase: "scanning" });
    } catch (e) {
      set({ flowError: String(e), uninstallPhase: "idle" });
    }
  },

  scanAfterUninstall: async (app) => {
    set({ uninstallPhase: "scanning", flowError: null });
    try {
      const residues = await scanResidues(app.name, app.install_location);
      // Pre-select safe items
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

  moveSelectedToStaging: async (softwareName) => {
    const { residues, selectedResiduePaths } = get();
    if (!residues) return;
    set({ uninstallPhase: "staging" });
    try {
      const toMove = residues.items
        .filter((r) => selectedResiduePaths.has(r.path))
        .map((r) => ({ path: r.path, category: r.category, safety: r.safety }));
      if (toMove.length === 0) {
        set({ uninstallPhase: "done" });
        return;
      }
      const id = await moveToStaging(toMove, softwareName);
      set({ stagedId: id, uninstallPhase: "done" });
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
      stagedId: null,
      flowError: null,
      selectedApp: null,
    }),
}));
