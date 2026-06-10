import { useAppStore } from "@/store";
import Dusty, { type DustyState } from "@/components/Dusty";
import { formatSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dustyChat, hasApiKey } from "@/lib/ai-client";
import { Trash2 } from "lucide-react";

type BarState = "idle" | "selected" | "scanning" | "done" | "warning";

function deriveBarState(): BarState {
  const s = useAppStore.getState();
  if (s.flowError) return "warning";
  if (s.uninstallPhase === "done") return "done";
  if (
    s.uninstallPhase === "uninstalling" ||
    s.uninstallPhase === "scanning" ||
    s.uninstallPhase === "staging"
  )
    return "scanning";
  if (s.selectedApp && s.uninstallPhase === "idle") return "selected";
  return "idle";
}

const BAR_CONTENT: Record<
  BarState,
  {
    dusty: DustyState;
    chipLabels: string[];
    bubble: (ctx: { name?: string; size?: string }) => string;
    buttonLabel: string;
    buttonVariant: "default" | "destructive" | "secondary" | "outline";
    buttonDisabled: boolean;
  }
> = {
  idle: {
    dusty: "idle",
    chipLabels: ["磁盘占用？", "可以清理的？", "帮我分析"],
    bubble: () => "嗨～有需要随时叫我哦！",
    buttonLabel: "选择软件",
    buttonVariant: "secondary",
    buttonDisabled: true,
  },
  selected: {
    dusty: "idle",
    chipLabels: ["这些能删吗？", "哪些必须留？", "帮我总结"],
    bubble: (ctx) =>
      `${ctx.name ?? ""} 点击可以深度卸载哦～`,
    buttonLabel: "深度卸载",
    buttonVariant: "destructive",
    buttonDisabled: false,
  },
  scanning: {
    dusty: "sweeping",
    chipLabels: ["扫到什么了？", "进度如何？", "取消扫描"],
    bubble: () => "正在扫描残留文件，稍等～",
    buttonLabel: "扫描中",
    buttonVariant: "secondary",
    buttonDisabled: true,
  },
  done: {
    dusty: "celebrate",
    chipLabels: ["清了什么？", "查看报告", "再扫一次"],
    bubble: (ctx) =>
      `清理完啦！释放了${ctx.size ?? "一些"}空间～`,
    buttonLabel: "查看报告",
    buttonVariant: "default",
    buttonDisabled: false,
  },
  warning: {
    dusty: "warning",
    chipLabels: ["什么不能删？", "风险说明", "取消操作"],
    bubble: () =>
      "注意：删除后不可恢复，请确认！",
    buttonLabel: "确认删除",
    buttonVariant: "destructive",
    buttonDisabled: false,
  },
};

export default function DustyBar() {
  const selectedApp = useAppStore((s) => s.selectedApp);
  const residues = useAppStore((s) => s.residues);
  const uninstallPhase = useAppStore((s) => s.uninstallPhase);
  const startUninstall = useAppStore((s) => s.startUninstall);
  const resetUninstall = useAppStore((s) => s.resetUninstall);

  const barState = deriveBarState();
  const content = BAR_CONTENT[barState];

  const ctx = {
    name: selectedApp?.name,
    size: residues ? formatSize(residues.total_size_kb) : undefined,
  };

  const handleChipClick = async (text: string) => {
    const hasKey = await hasApiKey();
    if (!hasKey) return;
    // Open chat or send directly — for now just trigger chat
    await dustyChat(text, {
      softwareName: selectedApp?.name ?? "disk cleanup",
      residueSummary: residues
        ? `${residues.total_items} items`
        : "not scanned",
      currentStage: barState,
    });
  };

  const handleButtonClick = () => {
    if (barState === "selected" && selectedApp) {
      startUninstall(selectedApp);
    } else if (barState === "done") {
      resetUninstall();
    }
  };

  return (
    <div className="shrink-0 bg-[#FFF8EE] border-t border-[#EDE0D0] px-3 py-2">
      {/* Chips row */}
      <div className="flex gap-2 mb-2">
        {content.chipLabels.map((label) => (
          <button
            key={label}
            onClick={() => handleChipClick(label)}
            className="bg-[#FAF6EF] border border-[#EDE0D0] rounded-full px-2 py-0.5 text-[9px] text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bubble row */}
      <div className="flex items-center gap-2">
        {/* Dusty */}
        <div className="shrink-0">
          <Dusty state={content.dusty} size={36} />
        </div>

        {/* Bubble */}
        <div className="flex-1 min-w-0 bg-white border border-[#EDE0D0] rounded-lg px-2 py-1">
          <p className="text-[9px] text-foreground leading-relaxed truncate">
            {content.bubble(ctx)}
          </p>
        </div>

        {/* Right: tag + button */}
        <div className="shrink-0 flex items-center gap-2">
          {selectedApp && (
            <span className="text-[8px] text-muted-foreground truncate max-w-[80px]">
              {uninstallPhase === "done"
                ? "完成"
                : uninstallPhase !== "idle"
                  ? "处理中"
                  : `已选: ${selectedApp.name}`}
            </span>
          )}
          <Button
            size="sm"
            variant={content.buttonVariant}
            className="rounded-lg"
            disabled={content.buttonDisabled}
            onClick={handleButtonClick}
          >
            {barState === "selected" && <Trash2 className="w-3.5 h-3.5" />}
            {content.buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
