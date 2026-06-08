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
  const [onboardingDone, setOnboardingDone] = useState(hasOnboarded());

  if (!onboardingDone) {
    return <Onboarding onFinish={() => setOnboardingDone(true)} />;
  }

  if (uninstallPhase !== "idle") {
    return (
      <>
        <Uninstall />
        <ChatBubble />
      </>
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
    <>
      {renderPage()}
      <ChatBubble />
    </>
  );
}

export default App;
