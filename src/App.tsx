import { useState } from "react";
import { Home, PieChart, Settings } from "lucide-react";
import HomePage from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import DiskClean from "@/pages/DiskClean";
import SettingsPage from "@/pages/Settings";
import Onboarding, { hasOnboarded } from "@/components/Onboarding";
import DustyBar from "@/components/DustyBar";
import { useAppStore } from "@/store";
type Page = "home" | "diskclean" | "settings";

const NAV_ITEMS: { id: Page; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "首页" },
  { id: "diskclean", icon: PieChart, label: "磁盘分析" },
  { id: "settings", icon: Settings, label: "设置" },
];

function App() {
  const uninstallPhase = useAppStore((s) => s.uninstallPhase);
  const fetchApps = useAppStore((s) => s.fetchApps);
  const [page, setPage] = useState<Page>("home");
  const [onboardingDone, setOnboardingDone] = useState(
    import.meta.env.DEV ? false : hasOnboarded()
  );

  if (!onboardingDone) {
    return (
      <div
        style={{
          backgroundColor: "#FAF6EF",
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Onboarding onFinish={() => setOnboardingDone(true)} />
      </div>
    );
  }

  // Uninstall flow — full screen, no shell
  if (uninstallPhase !== "idle") {
    return (
      <div
        style={{
          backgroundColor: "#FAF6EF",
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Uninstall onDone={() => fetchApps()} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#FAF6EF",
      }}
    >
      {/* Top bar — unified for all pages */}
      <div
        style={{
          height: 44,
          background: "#FFF8EE",
          borderBottom: "0.5px solid #EDE0D0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#3D2C1E" }}>
          Dusty 磁盘清理
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E07060" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#F0C070" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#6DBF9E" }} />
        </div>
      </div>

      {/* Body: sidebar + right */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar — unified for all pages */}
        <div
          style={{
            width: 48,
            background: "#FFF3E3",
            borderRight: "0.5px solid #EDE0D0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 0",
            gap: 16,
            flexShrink: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === page;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "#E8A87C" : "transparent",
                  color: isActive ? "white" : "#3D2C1E",
                  transition: "all 0.15s",
                }}
              >
                <item.icon style={{ width: 20, height: 20 }} />
              </button>
            );
          })}
        </div>

        {/* Right column: content + DustyBar */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            {page === "home" && (
              <HomePage />
            )}
            {page === "settings" && (
              <SettingsPage onBack={() => setPage("home")} />
            )}
            <div style={{
              display: page === "diskclean" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              overflow: "hidden",
            }}>
              <DiskClean onBack={() => setPage("home")} />
            </div>
          </div>
          <DustyBar />
        </div>
      </div>
    </div>
  );
}

export default App;
