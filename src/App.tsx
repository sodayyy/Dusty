import { useState } from "react";
import Home from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import DiskClean from "@/pages/DiskClean";
import Settings from "@/pages/Settings";
import ChatBubble from "@/components/ChatBubble";
import Onboarding, { hasOnboarded } from "@/components/Onboarding";
import { useAppStore } from "@/store";

type Page = "home" | "diskclean" | "settings";

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

  if (uninstallPhase !== "idle") {
    return (
      <div style={{ backgroundColor: "#FAF6EF", minHeight: "100vh" }}>
        <Uninstall />
        <ChatBubble />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "diskclean":
        return <DiskClean onBack={() => setPage("home")} />;
      case "settings":
        return <Settings onBack={() => setPage("home")} />;
      default:
        return <Home onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ backgroundColor: "#FAF6EF", minHeight: "100vh" }}>
      {renderPage()}
      <ChatBubble />
    </div>
  );
}

export default App;
