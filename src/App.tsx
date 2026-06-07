import { useState } from "react";
import Home from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import DiskClean from "@/pages/DiskClean";
import { useAppStore } from "@/store";

type Page = "home" | "diskclean";

function App() {
  const uninstallPhase = useAppStore((s) => s.uninstallPhase);
  const [page, setPage] = useState<Page>("home");

  if (uninstallPhase !== "idle") {
    return <Uninstall />;
  }

  switch (page) {
    case "diskclean":
      return (
        <DiskClean
          onBack={() => setPage("home")}
        />
      );
    default:
      return <Home onNavigate={setPage} />;
  }
}

export default App;
