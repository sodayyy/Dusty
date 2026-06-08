import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  FileText,
  Database,
  Cog,
  Clock,
  Monitor,
  CheckSquare,
  Square,
} from "lucide-react";
import type { ResidueItem } from "@/lib/tauri-commands";

const safetyStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  safe: {
    bg: "bg-safe/10",
    text: "text-safe",
    border: "border-safe/30",
    label: "可清理",
  },
  caution: {
    bg: "bg-warn/10",
    text: "text-warn",
    border: "border-warn/30",
    label: "谨慎",
  },
  never: {
    bg: "bg-danger/10",
    text: "text-danger",
    border: "border-danger/30",
    label: "禁止",
  },
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  software: Monitor,
  data: FolderOpen,
  cache: FileText,
  registry: Database,
  service: Cog,
  startup: Clock,
  other: FileText,
};

export default function ScanResult() {
  const { residues, selectedResiduePaths, toggleResidue } = useAppStore();

  if (!residues || residues.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <CheckSquare className="w-8 h-8 text-chart-2/40" />
        <p className="text-sm text-muted-foreground">没有发现残留</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium text-muted-foreground px-1">
        残留清单（共 {residues.total_items} 项）
      </h3>

      {residues.items.map((item) => (
        <ResidueCard
          key={item.path}
          item={item}
          selected={selectedResiduePaths.has(item.path)}
          onToggle={() => toggleResidue(item.path)}
        />
      ))}
    </div>
  );
}

function ResidueCard({
  item,
  selected,
  onToggle,
}: {
  item: ResidueItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const safety = safetyStyles[item.safety] ?? safetyStyles.other;
  const Icon = categoryIcons[item.category] ?? FileText;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border",
        selected
          ? "bg-primary/10 border-primary/30"
          : "bg-card/50 border-transparent hover:bg-card"
      )}
    >
      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        {selected ? (
          <CheckSquare className="w-4 h-4 text-primary" />
        ) : (
          <Square className="w-4 h-4 text-muted-foreground/30" />
        )}
      </div>

      {/* Icon */}
      <div className={cn("p-1.5 rounded-lg shrink-0", safety.bg)}>
        <Icon className={cn("w-4 h-4", safety.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{item.description}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {item.path}
        </p>
      </div>

      {/* Safety badge */}
      <div className="shrink-0 mt-0.5">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium",
            safety.bg,
            safety.text
          )}
        >
          {safety.label}
        </span>
      </div>
    </button>
  );
}
