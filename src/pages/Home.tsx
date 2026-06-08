import { motion, AnimatePresence } from "framer-motion";
import { Trash2, PieChart, Settings, AlertTriangle } from "lucide-react";
import AppList from "@/components/AppList";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";

export default function Home({ onNavigate }: { onNavigate: (page: "diskclean" | "settings") => void }) {
  const selectedApp = useAppStore((s) => s.selectedApp);
  const startUninstall = useAppStore((s) => s.startUninstall);
  const flowError = useAppStore((s) => s.flowError);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            <span className="text-primary">Dusty</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">你的专属 Windows 清洁工</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => onNavigate("diskclean")}
          >
            <PieChart /> 磁盘分析
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onNavigate("settings")}
          >
            <Settings />
          </Button>
        </div>
      </header>

      {/* App list */}
      <main className="flex-1 min-h-0">
        <AppList />
      </main>

      {/* Bottom action bar — shown when an app is selected */}
      <AnimatePresence>
        {selectedApp && (
          <motion.footer
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="shrink-0 px-4 pb-5 pt-3 border-t border-border bg-background"
          >
            {flowError && (
              <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {flowError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedApp.name}
                </p>
                {selectedApp.publisher && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedApp.publisher}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => startUninstall(selectedApp)}
                className="rounded-xl text-primary-foreground"
              >
                <Trash2 /> 深度卸载
              </Button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
