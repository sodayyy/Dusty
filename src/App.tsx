import { useState } from "react";
import { Home, PieChart, Settings } from "lucide-react";
import HomePage from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import DiskClean from "@/pages/DiskClean";
import SettingsPage from "@/pages/Settings";
import DustyBar from "@/components/DustyBar";
import Onboarding, { hasOnboarded } from "@/components/Onboarding";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

type Page = "home" | "uninstall" | "diskclean" | "settings";

const NAV_ITEMS: {
  id: Page;
  icon: typeof Home;
  label: string;
}[] = [
  { id: "home", icon: Home, label: "首页" },
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
      <div style={{ backgroundColor: "#FAF6EF", minHeight: "100vh" }}>
        <Onboarding onFinish={() => setOnboardingDone(true)} />
      </div>
    );
  }

  // Uninstall flow overrides the sidebar layout
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

  const activePage = page;

  return (
    <div
      style={{
        backgroundColor: "#FAF6EF",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sidebar + Content area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div className="w-12 shrink-0 bg-[#FFF3E3] border-r border-[#EDE0D0] flex flex-col items-center py-3 gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "bg-[#EDE0D0] text-muted-foreground hover:bg-primary/30"
                )}
              >
                <item.icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden">
            {activePage === "diskclean" ? (
              <DiskClean onBack={() => setPage("home")} />
            ) : activePage === "settings" ? (
              <SettingsPage onBack={() => setPage("home")} />
            ) : (
              <HomePage />
            )}
          </main>
        </div>
      </div>

      {/* Bottom DustyBar */}
      <DustyBar />
    </div>
  );
}

export default App;
