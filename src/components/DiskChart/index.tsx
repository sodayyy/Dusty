import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySummary } from "@/lib/tauri-commands";
import { catColorHex } from "@/lib/colors";
import { formatSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  data: CategorySummary[];
  totalSize: number;
  drilledCategory?: string | null;
  onDrill?: (category: string) => void;
}

export default function DiskChart({ data, drilledCategory, onDrill }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number>(-1);

  const chartData = data.map((d) => ({
    name: d.category_cn,
    value: d.total_size_kb,
    category: d.category,
    count: d.item_count,
    fill: catColorHex(d.category),
  }));

  const drillIdx = drilledCategory
    ? chartData.findIndex((d) => d.category === drilledCategory)
    : -1;
  const selectedIdx = drillIdx >= 0 ? drillIdx : hoverIdx;

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

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {chartData.map((d, idx) => (
          <Button
            key={d.category}
            variant="ghost"
            size="xs"
            onClick={() => {
              onDrill?.(d.category);
              setHoverIdx(selectedIdx === idx ? -1 : idx);
            }}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(-1)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            {d.name}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
