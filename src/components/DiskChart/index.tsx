import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { CategorySummary } from "@/lib/tauri-commands";
import { catColorHex } from "@/lib/colors";
import { formatSize } from "@/lib/utils";

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
    <div
      style={{
        backgroundColor: '#FFF8EE',
        borderRadius: 16,
        border: '0.5px solid #EDE0D0',
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <style>{`svg { outline: none !important; } svg * { outline: none !important; }`}</style>
      <div style={{ height:200, fontSize:0 }}>
        <ResponsiveContainer width="100%" height="100%" style={{ outline:'none' }}>
          <PieChart style={{ outline:'none', border:'none', userSelect:'none' }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {selectedIdx >= 0 && (
          <span style={{ fontSize:12, color:'#8A7060' }}>
            {chartData[selectedIdx].name}・{formatSize(chartData[selectedIdx].value)}・{chartData[selectedIdx].count} 项
          </span>
        )}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'6px 16px', marginTop:8 }}>
        {chartData.map((d, idx) => (
          <button
            key={d.category}
            onClick={() => {
              onDrill?.(d.category);
              setHoverIdx(selectedIdx === idx ? -1 : idx);
            }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'4px 10px', borderRadius:20,
              border: selectedIdx === idx ? '1px solid #E8A87C' : '1px solid #EDE0D0',
              backgroundColor: selectedIdx === idx ? '#FFF3E3' : 'transparent',
              cursor:'pointer', fontSize:12, color:'#3D2C1E',
            }}
          >
            <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor: d.fill }} />
            {d.name}
          </button>
        ))}
      </div>
    </div>
  );
}
