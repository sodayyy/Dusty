import { PieChart, Settings } from "lucide-react";
import AppList from "@/components/AppList";
import { useAppStore } from "@/store";

export default function Home({ onNavigate }: { onNavigate: (page: "diskclean" | "settings") => void }) {
  const selectedApp = useAppStore((s) => s.selectedApp);
  const startUninstall = useAppStore((s) => s.startUninstall);
  const flowError = useAppStore((s) => s.flowError);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#FAF6EF]">
      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            <span className="text-primary">Dusty</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">你的专属 Windows 清洁工</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate("diskclean")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDE0D0] bg-[#FFF8EE] text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <PieChart className="w-3.5 h-3.5" /> 磁盘分析
          </button>
          <button
            onClick={() => onNavigate("settings")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDE0D0] bg-[#FFF8EE] text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* App list */}
      <main className="flex-1 min-h-0">
        <AppList />
      </main>

      {/* Bottom action bar */}
      {selectedApp && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#FFF8EE",
            borderTop: "1px solid #EDE0D0",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {flowError && (
            <p style={{ color: "#E07060", fontSize: 12, marginBottom: 8 }}>
              {flowError}
            </p>
          )}
          <span style={{ color: "#3D2C1E", fontSize: 14 }}>
            已选择：{selectedApp.name}
          </span>
          <button
            onClick={() => startUninstall(selectedApp)}
            style={{
              background: "#E8A87C",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            深度卸载
          </button>
        </div>
      )}
    </div>
  );
}
