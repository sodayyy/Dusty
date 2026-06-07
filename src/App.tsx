import Home from "@/pages/Home";
import Uninstall from "@/pages/Uninstall";
import { useAppStore } from "@/store";

function App() {
  const uninstallPhase = useAppStore((s) => s.uninstallPhase);
  return uninstallPhase !== "idle" ? <Uninstall /> : <Home />;
}

export default App;
