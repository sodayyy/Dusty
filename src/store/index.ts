import { create } from "zustand";
import { getInstalledApps, type AppInfo } from "@/lib/tauri-commands";

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
}));
