import { useState, useEffect } from "react";
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
    s.uninstallPhase === "verifying" ||
    s.uninstallPhase === "deleting"
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
    chips: ["磁盘占用？", "可以清理的？"],
    bubble: () => "嗨～有需要随时叫我哦！",
    label: "",
    btnLabel: "选择软件",
    btnDisabled: true,
    dustyEmoji: "🧹",
  },
  selected: {
    chips: ["这些能删吗？", "哪些必须留？"],
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

  const [chatReply, setChatReply] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [inputText, setInputText] = useState("");

  const barState = deriveBarState();
  const content = BAR_CONTENT[barState];

  useEffect(() => {
    setChatReply(null);
    setNoKey(false);
    setInputText("");
  }, [barState]);

  const ctx = {
    name: selectedApp?.name,
    size: residues ? formatSize(residues.total_size_kb) : undefined,
  };

  const handleChipOrSend = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const hasKey = await hasApiKey();
    if (!hasKey) {
      setNoKey(true);
      setTimeout(() => setNoKey(false), 3000);
      return;
    }
    setNoKey(false);
    setChatLoading(true);
    setChatReply(null);
    try {
      const reply = await dustyChat(text, {
        softwareName: selectedApp
          ? [
              selectedApp.name,
              selectedApp.publisher ? `开发商：${selectedApp.publisher}` : "",
              selectedApp.version ? `版本：${selectedApp.version}` : "",
              selectedApp.install_location ? `安装路径：${selectedApp.install_location}` : "",
            ]
              .filter(Boolean)
              .join("，")
          : "磁盘清理",
        residueSummary: residues
          ? `已扫描到 ${residues.total_items} 项残留（注册表 ${residues.registry_count} 条，文件 ${residues.file_count} 个，系统项 ${residues.system_count} 个）`
          : "尚未扫描",
        currentStage: barState === "idle"
          ? "空闲，用户正在浏览软件列表"
          : barState === "selected"
          ? "已选中软件，准备卸载"
          : barState === "scanning"
          ? "正在扫描残留"
          : barState === "done"
          ? "清理完成"
          : barState === "warning"
          ? "危险操作确认"
          : barState,
      });
      setChatReply(reply);
    } catch (e) {
      setChatReply("呜，连不上 AI 了…稍后再试试吧～");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || chatLoading) return;
    setInputText("");
    await handleChipOrSend(text);
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
        padding: "8px 12px",
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
            onClick={() => handleChipOrSend(label)}
            disabled={chatLoading}
            style={{
              background: "#FAF6EF",
              border: "0.5px solid #EDE0D0",
              borderRadius: 10,
              padding: "4px 10px",
              fontSize: 11,
              color: "#8A7060",
              cursor: chatLoading ? "default" : "pointer",
              whiteSpace: "nowrap",
              opacity: chatLoading ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="问问 Dusty..."
          disabled={chatLoading}
          style={{
            flex: 1,
            height: 30,
            padding: '0 10px',
            borderRadius: 8,
            border: '0.5px solid #EDE0D0',
            background: '#FAF6EF',
            fontSize: 12,
            color: '#3D2C1E',
            outline: 'none',
            opacity: chatLoading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || chatLoading}
          style={{
            height: 30,
            padding: '0 12px',
            borderRadius: 8,
            border: 'none',
            background: inputText.trim() && !chatLoading ? '#E8A87C' : '#EDE0D0',
            color: inputText.trim() && !chatLoading ? 'white' : '#8A7060',
            fontSize: 12,
            fontWeight: 500,
            cursor: inputText.trim() && !chatLoading ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          发送
        </button>
      </div>

      {/* Main row: Dusty + Bubble + Right group */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            height: "auto",
            maxHeight: chatReply ? 72 : 40,
            fontSize: 12,
            color: "#3D2C1E",
            lineHeight: 1.5,
            flex: 1,
            maxWidth: "45%",
            overflowY: chatReply ? "auto" : "hidden",
            overflowX: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: chatReply ? "normal" : "nowrap",
            display: "flex",
            alignItems: chatReply ? "flex-start" : "center",
            transition: "max-height 0.2s ease",
          }}
        >
          {chatLoading
            ? "Dusty 正在想…"
            : noKey
            ? "需要先在设置里填写 API Key 哦～"
            : chatReply ?? content.bubble(ctx)}
        </div>

        {/* Right group — pushed to far right */}
        <div
          style={{
            marginLeft: "auto",
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
                fontSize: 11,
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
              border: content.btnDisabled ? "1px solid #D4C4B0" : "none",
              borderRadius: 6,
              padding: "8px 18px",
              fontSize: 12,
              fontWeight: 600,
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
