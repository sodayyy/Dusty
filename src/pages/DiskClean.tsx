import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, HardDrive, X } from "lucide-react";
import { scanClassified, getDefaultScanPaths, type CategorySummaryList } from "@/lib/tauri-commands";
import DiskChart from "@/components/DiskChart";
import { catColorHex } from "@/lib/colors";
import { formatSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DiskClean({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<CategorySummaryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);

  const drilledData = data?.summaries.find((s) => s.category === drilledCategory) ?? null;

  useEffect(() => {
    (async () => {
      try {
        const paths = await getDefaultScanPaths();
        const result = await scanClassified(paths);
        setData(result);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#FAF6EF]">
      <header className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">磁盘成分分析</h1>
          {data && (
            <p className="text-xs text-muted-foreground">
              共 {formatSize(data.total_size_kb)}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {loading && (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">正在扫描磁盘…</p>
              <p className="text-xs text-muted-foreground mt-1">
                这可能需要几秒钟
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center pt-20 gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              onClick={() => {
                setLoading(true);
                setError(null);
                getDefaultScanPaths()
                  .then(scanClassified)
                  .then(setData)
                  .catch((e) => setError(String(e)))
                  .finally(() => setLoading(false));
              }}
              className="rounded-lg"
            >
              重试
            </Button>
          </div>
        )}

        {!loading && !error && data && data.summaries.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 gap-2">
            <HardDrive className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">未扫描到数据</p>
          </div>
        )}

        {!loading && !error && data && data.summaries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5 pt-4"
          >
            <DiskChart
              data={data.summaries}
              totalSize={data.total_size_kb}
              drilledCategory={drilledCategory}
              onDrill={(cat) =>
                setDrilledCategory(drilledCategory === cat ? null : cat)
              }
            />

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-1">
                分类明细
              </h3>
              {data.summaries.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: catColorHex(cat.category) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cat.category_cn}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cat.item_count} 项
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatSize(cat.total_size_kb)}
                    </p>
                    <div className="w-16 h-1 rounded-full bg-muted mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${data.total_size_kb > 0 ? (cat.total_size_kb / data.total_size_kb) * 100 : 0}%`,
                          backgroundColor: catColorHex(cat.category),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Drill-down detail panel */}
            <AnimatePresence>
              {drilledData && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.25 }}
                  className="bg-card rounded-2xl border border-border p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: catColorHex(drilledData.category),
                        }}
                      />
                      <h3 className="text-sm font-medium text-foreground">
                        {drilledData.category_cn}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDrilledCategory(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FAF6EF] rounded-xl px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {formatSize(drilledData.total_size_kb)}
                      </p>
                      <p className="text-2xs text-muted-foreground">占用空间</p>
                    </div>
                    <div className="bg-[#FAF6EF] rounded-xl px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {drilledData.item_count}
                      </p>
                      <p className="text-2xs text-muted-foreground">文件/文件夹数</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF6EF] rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      此分类包含 {drilledData.item_count} 个项目，建议先预览再决定是否清理。
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
