import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, ChevronRight, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

function formatSize(kb: number): string {
  if (kb === 0) return "";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export default function AppList() {
  const { apps, loading, error, selectedApp, searchQuery, fetchApps, selectApp, setSearchQuery, filteredApps } =
    useAppStore();

  useEffect(() => {
    fetchApps();
  }, []);

  const visibleApps = filteredApps();
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative px-4 pt-4 pb-2">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索软件名称或开发商…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
        />
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            {hasQuery
              ? `找到 ${visibleApps.length} 个匹配`
              : `共 ${apps.length} 个已安装软件`}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">正在读取软件列表…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-destructive">读取失败：{error}</p>
            <button
              onClick={() => fetchApps()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
            >
              重试
            </button>
          </div>
        )}

        {/* Empty search */}
        {!loading && !error && hasQuery && visibleApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">没有找到匹配的软件</p>
          </div>
        )}

        {/* App list */}
        {!loading && !error && (
          <div className="space-y-1.5">
            <AnimatePresence>
              {visibleApps.map((app, i) => {
                const isSelected = selectedApp?.name === app.name;
                return (
                  <motion.button
                    key={app.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015, duration: 0.25 }}
                    onClick={() => selectApp(isSelected ? null : app)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                      isSelected
                        ? "bg-primary/15 ring-1 ring-primary/30"
                        : "hover:bg-card/80"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {app.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {app.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {app.publisher ? (
                          <span className="text-xs text-muted-foreground truncate">
                            {app.publisher}
                          </span>
                        ) : null}
                        {app.version ? (
                          <span className="text-xs text-muted-foreground/70">
                            v{app.version}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Size + chevron */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {app.size_kb > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatSize(app.size_kb)}
                        </span>
                      )}
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-muted-foreground/40 transition-transform",
                          isSelected && "rotate-90"
                        )}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
