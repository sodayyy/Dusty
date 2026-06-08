import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store";
import ScanResult from "@/components/ScanResult";
import { formatSize } from "@/lib/utils";

export default function Uninstall() {
  const {
    selectedApp,
    uninstallPhase,
    uninstallResult,
    flowError,
    startUninstall,
    scanAfterUninstall,
    resetUninstall,
    moveSelectedToStaging,
    selectedResiduePaths,
    residues,
  } = useAppStore();

  // Auto-advance: after uninstall completes, scan for residues
  useEffect(() => {
    if (uninstallPhase === "scanning" && selectedApp && uninstallResult) {
      scanAfterUninstall(selectedApp);
    }
  }, [uninstallPhase, selectedApp, uninstallResult]);

  if (!selectedApp) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-4">
        <p className="text-muted-foreground text-sm">没有选中的软件</p>
        <button
          onClick={resetUninstall}
          className="text-sm text-primary underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const selectedCount = selectedResiduePaths.size;
  const totalSize =
    residues?.items
      .filter((r) => selectedResiduePaths.has(r.path))
      .reduce((sum, r) => sum + r.size_kb, 0) ?? 0;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={resetUninstall}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {selectedApp.name}
          </h1>
          <p className="text-xs text-muted-foreground">深度卸载</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Phase: idle — confirm */}
        {uninstallPhase === "idle" && (
          <ConfirmStep
            app={selectedApp}
            onStart={() => startUninstall(selectedApp)}
            error={flowError}
          />
        )}

        {/* Phase: uninstalling */}
        {uninstallPhase === "uninstalling" && (
          <LoadingStep message="正在调用官方卸载程序…" sub="请稍候，完成后会自动扫描残留" />
        )}

        {/* Phase: scanning */}
        {uninstallPhase === "scanning" &&
          !residues && (
            <LoadingStep message="正在扫描残留文件…" sub="检查注册表、文件和系统项" />
          )}

        {/* Phase: review residues */}
        {uninstallPhase === "review" && residues && (
          <ReviewStep
            residues={residues}
            uninstallResult={uninstallResult}
            selectedCount={selectedCount}
            totalSize={totalSize}
            onStage={() => moveSelectedToStaging(selectedApp.name)}
            error={flowError}
          />
        )}

        {/* Phase: staging (moving) */}
        {uninstallPhase === "staging" && (
          <LoadingStep message="正在移入暂存区…" sub="文件将在7天后自动清除" />
        )}

        {/* Phase: done */}
        {uninstallPhase === "done" && (
          <DoneStep
            softwareName={selectedApp.name}
            selectedCount={selectedCount}
            totalSize={totalSize}
            onDone={resetUninstall}
          />
        )}
      </main>
    </div>
  );
}

function ConfirmStep({
  app,
  onStart,
  error,
}: {
  app: { name: string; publisher: string; version: string; install_location: string };
  onStart: () => void;
  error: string | null;
}) {
  return (
    <div className="pt-8 space-y-5">
      <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <h2 className="text-sm font-medium text-foreground">确认卸载</h2>
        <div className="space-y-2 text-sm">
          <InfoRow label="软件名" value={app.name} />
          {app.publisher && <InfoRow label="开发商" value={app.publisher} />}
          {app.version && <InfoRow label="版本" value={app.version} />}
          {app.install_location && (
            <InfoRow label="位置" value={app.install_location} />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        将先调用官方卸载程序，然后扫描残留文件、注册表项和系统项。
        所有删除内容会先移入暂存区，7天内可随时还原。
      </p>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
      >
        开始深度卸载
      </button>
    </div>
  );
}

function LoadingStep({ message, sub }: { message: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center pt-20 gap-4"
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </motion.div>
  );
}

function ReviewStep({
  residues,
  uninstallResult,
  selectedCount,
  totalSize,
  onStage,
  error,
}: {
  residues: { items: { path: string; safety: string }[]; total_items: number; registry_count: number; file_count: number; system_count: number };
  uninstallResult: { success: boolean } | null;
  selectedCount: number;
  totalSize: number;
  onStage: () => void;
  error: string | null;
}) {
  return (
    <div className="pt-4 space-y-4">
      {/* Uninstall result banner */}
      <div
        className={`rounded-xl px-4 py-3 text-sm ${
          uninstallResult?.success
            ? "bg-chart-2/10 text-chart-2"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {uninstallResult?.success
          ? "官方卸载程序已执行完成"
          : "官方卸载程序可能未完全成功"}
      </div>

      {/* Scan summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="注册表项" count={residues.registry_count} />
        <StatBadge label="文件/文件夹" count={residues.file_count} />
        <StatBadge label="系统项" count={residues.system_count} />
      </div>

      {/* Residue list */}
      <ScanResult />

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-background pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            已选 {selectedCount} 项 · 共 {formatSize(totalSize)}
          </span>
        </div>

        {error && (
          <div className="mb-3 text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </div>
        )}

        <button
          onClick={onStage}
          disabled={selectedCount === 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {selectedCount === 0
            ? "请选择要清理的残留"
            : `移入暂存区 (${selectedCount}项)`}
        </button>
      </div>
    </div>
  );
}

function DoneStep({
  softwareName,
  selectedCount,
  totalSize,
  onDone,
}: {
  softwareName: string;
  selectedCount: number;
  totalSize: number;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center pt-16 gap-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-chart-2/15 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-chart-2" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">清理完成</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {softwareName} 的 {selectedCount} 个残留已扫进垃圾桶
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          释放空间约 {formatSize(totalSize)}，7天后自动清除
        </p>
      </div>
      <button
        onClick={onDone}
        className="mt-4 px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        完成
      </button>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground truncate text-right">{value}</span>
    </div>
  );
}

function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 text-center">
      <div className="text-lg font-semibold text-foreground">{count}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
