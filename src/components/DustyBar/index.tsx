import { useAppStore } from "@/store";
import { formatSize } from "@/lib/utils";
import { dustyChat, hasApiKey } from "@/lib/ai-client";

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
    chips: string[];
    bubble: (ctx: { name?: string; size?: string }) => string;
    label: string;
    btnLabel: string;
    btnDisabled: boolean;
    dustyEmoji: string;
  }
> = {
  idle: {
    chips: ["磁盘占用？", "可以清理的？", "帮我分析"],
    bubble: () => "嗨～有需要随时叫我哦！",
    label: "",
    btnLabel: "选择软件",
    btnDisabled: true,
    dustyEmoji: "🧹",
  },
  selected: {
    chips: ["这些能删吗？", "哪些必须留？", "帮我总结"],
    bubble: (ctx) =>
      `${ctx.name ?? ""} 有残留，卸载时一起清掉更干净哦～`,
    label: `已选：${useAppStore.getState().selectedApp?.name ?? ""}`,
    btnLabel: "深度卸载",
    btnDisabled: false,
    dustyEmoji: "🧹",
  },
  scanning: {
    chips: ["扫到什么了？", "进度如何？", "取消扫描"],
    bubble: () => "正在扫描残留文件，稍等～",
    label: "扫描中",
    btnLabel: "扫描中",
    btnDisabled: true,
    dustyEmoji: "🔍",
  },
  done: {
    chips: ["清了什么？", "查看报告", "再扫一次"],
    bubble: (ctx) =>
      `清理完啦！释放了${ctx.size ?? "一些"}空间～`,
    label: "完成",
    btnLabel: "查看报告",
    btnDisabled: false,
    dustyEmoji: "✨",
  },
  warning: {
    chips: ["什么不能删？", "风险说明", "取消操作"],
    bubble: () => "注意：删除后不可恢复，请确认！",
    label: "⚠️ 危险",
    btnLabel: "确认删除",
    btnDisabled: false,
    dustyEmoji: "⚠️",
  },
};

export default function DustyBar() {
  const selectedApp = useAppStore((s) => s.selectedApp);
  const residues = useAppStore((s) => s.residues);
  const startUninstall = useAppStore((s) => s.startUninstall);
  const resetUninstall = useAppStore((s) => s.resetUninstall);

  const barState = deriveBarState();
  const content = BAR_CONTENT[barState];

  const ctx = {
    name: selectedApp?.name,
    size: residues ? formatSize(residues.total_size_kb) : undefined,
  };

  const handleChip = async (text: string) => {
    if (!(await hasApiKey())) return;
    await dustyChat(text, {
      softwareName: selectedApp?.name ?? "disk cleanup",
      residueSummary: residues ? `${residues.total_items} items` : "not scanned",
      currentStage: barState,
    });
  };

  const handleBtn = () => {
    if (barState === "selected" && selectedApp) {
      startUninstall(selectedApp);
    } else if (barState === "done") {
      resetUninstall();
    }
  };

  // Derive dynamic label
  const label =
    barState === "selected" && selectedApp
      ? `已选：${selectedApp.name}`
      : barState === "scanning"
        ? "扫描中"
        : barState === "done"
          ? "完成"
          : barState === "warning"
            ? "⚠️ 危险"
            : "";

  return (
    <div
      style={{
        background: "#FFF8EE",
        borderTop: "0.5px solid #EDE0D0",
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Chips */}
      <div style={{ display: "flex", gap: 6, height: 28, alignItems: "center" }}>
        {content.chips.map((label) => (
          <button
            key={label}
            onClick={() => handleChip(label)}
            style={{
              background: "#FAF6EF",
              border: "0.5px solid #EDE0D0",
              borderRadius: 10,
              padding: "4px 10px",
              fontSize: 10,
              color: "#8A7060",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main row: Dusty + Bubble + Right group */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44 }}>
        {/* Dusty figure */}
        <div
          style={{
            width: 36,
            height: 40,
            background: "#E8A87C",
            borderRadius: "50% 50% 38% 38%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 16,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {content.dustyEmoji}
        </div>

        {/* Bubble */}
        <div
          style={{
            background: "white",
            border: "0.5px solid #EDE0D0",
            borderRadius: "7px 7px 7px 2px",
            padding: "6px 10px",
            fontSize: 10,
            color: "#3D2C1E",
            lineHeight: 1.5,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {content.bubble(ctx)}
        </div>

        {/* Right group */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 10,
                color: "#8A7060",
                whiteSpace: "nowrap",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </span>
          )}
          <button
            onClick={handleBtn}
            disabled={content.btnDisabled}
            style={{
              background: content.btnDisabled ? "#EDE0D0" : "#E8A87C",
              color: content.btnDisabled ? "#8A7060" : "white",
              border: "none",
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 9,
              fontWeight: 500,
              cursor: content.btnDisabled ? "default" : "pointer",
            }}
          >
            {content.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
