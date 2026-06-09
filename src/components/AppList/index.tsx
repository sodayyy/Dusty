import { useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Package, ChevronRight, Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { cn, formatSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      <div className="relative px-6 pt-4 pb-2">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索软件名称或开发商…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#FFF8EE] border border-[#EDE0D0] text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-[#E8A87C]/40 transition-shadow"
        />
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="px-6 pb-2">
          <p className="text-xs text-muted-foreground">
            {hasQuery
              ? `找到 ${visibleApps.length} 个匹配`
              : `共 ${apps.length} 个已安装软件`}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#E8A87C] animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">正在读取软件列表…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-destructive">读取失败：{error}</p>
            <Button onClick={() => fetchApps()} className="rounded-lg">
              重试
            </Button>
          </div>
        )}

        {/* Empty search */}
        {!loading && !error && hasQuery && visibleApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">没有找到匹配的软件</p>
          </div>
        )}

        {/* App grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleApps.map((app, i) => {
                const isSelected = selectedApp?.name === app.name;
                const firstLetter = app.name.trim().charAt(0).toUpperCase();
                return (
                  <motion.button
                    key={app.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.01, duration: 0.2 }}
                    onClick={() => selectApp(isSelected ? null : app)}
                    className={cn(
                      "relative h-24 p-4 rounded-xl text-left transition-all border flex flex-col justify-between overflow-hidden min-w-0 cursor-pointer",
                      isSelected
                        ? "border-[#E8A87C] bg-[#FFF3E3] ring-1 ring-[#E8A87C]/30"
                        : "bg-[#FFF8EE] border-[#EDE0D0] hover:border-[#E8A87C] hover:shadow-sm"
                    )}
                  >
                    {/* Corner badge */}
                    <span className="absolute top-2 right-2 text-2xs font-semibold text-muted-foreground/40">
                      {/[A-Z]/.test(firstLetter) ? firstLetter : "#"}
                    </span>

                    {/* Name */}
                    <p className="text-sm font-semibold text-foreground truncate w-full pr-4">
                      {app.name}
                    </p>

                    {/* Publisher + Version */}
                    <div className="flex-1 flex items-end overflow-hidden min-w-0">
                      <p className="text-xs text-muted-foreground truncate w-full">
                        {[app.publisher, app.version ? `v${app.version}` : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {app.size_kb > 0 ? formatSize(app.size_kb) : ""}
                      </span>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-muted-foreground/30 transition-transform",
                          isSelected && "rotate-90 text-[#E8A87C]"
                        )}
                      />
                    </div>
                  </motion.button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
