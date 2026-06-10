import { useState } from "react";
import { Home, PieChart, Settings, Trash2 } from "lucide-react";
import HomePage from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import DiskClean from "@/pages/DiskClean";
import SettingsPage from "@/pages/Settings";
import DustyBar from "@/components/DustyBar";
import Onboarding, { hasOnboarded } from "@/components/Onboarding";
import { useAppStore } from "@/store";
type Page = "home" | "uninstall" | "diskclean" | "settings";

const NAV_ITEMS: { id: Page; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "首页" },
  { id: "uninstall", icon: Trash2, label: "卸载" },
  { id: "diskclean", icon: PieChart, label: "磁盘分析" },
  { id: "settings", icon: Settings, label: "设置" },
];

function App() {
  const uninstallPhase = useAppStore((s) => s.uninstallPhase);
  const [page, setPage] = useState<Page>("home");
  const [onboardingDone, setOnboardingDone] = useState(
    import.meta.env.DEV ? false : hasOnboarded()
  );

  if (!onboardingDone) {
    return (
      <div
        style={{
          backgroundColor: "#FAF6EF",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Onboarding onFinish={() => setOnboardingDone(true)} />
      </div>
    );
  }

  // Uninstall flow — full screen, no sidebar
  if (uninstallPhase !== "idle") {
    return (
      <div
        style={{
          backgroundColor: "#FAF6EF",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Uninstall />
        </div>
        <DustyBar />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#FAF6EF",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        border: "0.5px solid #EDE0D0",
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          background: "#FFF8EE",
          borderBottom: "0.5px solid #EDE0D0",
          padding: "7px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 500, color: "#3D2C1E" }}>
          Dusty 磁盘清理
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#E07060",
            }}
          />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#F0C070",
            }}
          />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#6DBF9E",
            }}
          />
        </div>
      </div>

      {/* Body: sidebar + right */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 44,
            background: "#FFF3E3",
            borderRight: "0.5px solid #EDE0D0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0",
            gap: 5,
            flexShrink: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.id === "home"
                ? page === "home"
                : item.id === page;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: isActive ? "#E8A87C" : "#EDE0D0",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <item.icon
                  style={{
                    width: 12,
                    height: 12,
                    color: isActive ? "white" : "#8A7060",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Right: content + bottom bar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            {page === "diskclean" ? (
              <DiskClean onBack={() => setPage("home")} />
            ) : page === "settings" ? (
              <SettingsPage onBack={() => setPage("home")} />
            ) : (
              <HomePage />
            )}
          </div>

          {/* Bottom DustyBar */}
          <DustyBar />
        </div>
      </div>
    </div>
  );
}

export default App;
