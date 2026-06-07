import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySummary } from "@/lib/tauri-commands";

const COLORS: Record<string, string> = {
  software: "#4A90D9",
  system: "#E07060",
  cache: "#6DBF9E",
  documents: "#F0C070",
  installer: "#E8A87C",
  other: "#A09080",
};

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

interface Props {
  data: CategorySummary[];
  totalSize: number;
}

export default function DiskChart({ data }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);

  const chartData = data.map((d) => ({
    name: d.category_cn,
    value: d.total_size_kb,
    category: d.category,
    count: d.item_count,
    fill: COLORS[d.category] ?? "#A09080",
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={(entry: { index: number }) =>
                entry.index === selectedIdx ? 103 : 95
              }
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={entry.fill}
                  stroke="none"
                  style={
                    selectedIdx >= 0 &&
                    chartData[selectedIdx]?.category !== entry.category
                      ? { opacity: 0.4 }
                      : {}
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as typeof chartData[0];
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-sm text-xs">
                    <p className="font-medium text-foreground">{d.name}</p>
                    <p className="text-muted-foreground">
                      {formatSize(d.value)} · {d.count} 项
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center label when a slice is selected */}
      {selectedIdx >= 0 && (
        <div className="text-center -mt-20 relative z-10 pointer-events-none">
          <p className="text-sm font-semibold text-foreground">
            {chartData[selectedIdx].name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSize(chartData[selectedIdx].value)}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {chartData.map((d, idx) => (
          <button
            key={d.category}
            onClick={() => setSelectedIdx(selectedIdx === idx ? -1 : idx)}
            onMouseEnter={() => setSelectedIdx(idx)}
            onMouseLeave={() => setSelectedIdx(-1)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            {d.name}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
