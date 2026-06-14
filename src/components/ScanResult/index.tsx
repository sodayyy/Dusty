import { useState } from "react";
import { useAppStore } from "@/store";
import {
  FolderOpen,
  FileText,
  Database,
  Cog,
  Clock,
  Monitor,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { ResidueItem } from "@/lib/tauri-commands";

const safetyConfig: Record<string, { bg: string; color: string; label: string }> = {
  safe:    { bg: 'rgba(109,191,158,0.12)', color: '#6DBF9E', label: '可清理' },
  caution: { bg: 'rgba(240,192,112,0.12)', color: '#F0C070', label: '谨慎'  },
  never:   { bg: 'rgba(224,112, 96,0.12)', color: '#E07060', label: '禁止'  },
};

const categoryIcons: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  software: Monitor,
  data: FolderOpen,
  cache: FileText,
  registry: Database,
  service: Cog,
  startup: Clock,
  other: FileText,
};

interface Props {
  loading?: boolean;
  onRetry?: () => void;
}

export default function ScanResult({ loading, onRetry }: Props) {
  const { residues, selectedResiduePaths, toggleResidue, flowError } =
    useAppStore();

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:8 }}>
        <Loader2 style={{ width:24, height:24, color:'#E8A87C' }} className="dusty-spin" />
        <p style={{ fontSize:14, color:'#8A7060' }}>正在扫描残留…</p>
      </div>
    );
  }

  if (flowError) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:12 }}>
        <AlertTriangle style={{ width:32, height:32, color:'rgba(224,112,96,0.6)' }} />
        <p style={{ fontSize:14, color:'#E07060', textAlign:'center', maxWidth:280 }}>
          扫描时出了点问题：{flowError}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{ background:'#E8A87C', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:14, cursor:'pointer' }}
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (!residues || residues.items.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:8 }}>
        <CheckSquare style={{ width:32, height:32, color:'rgba(109,191,158,0.4)' }} />
        <p style={{ fontSize:14, color:'#8A7060' }}>没有发现残留</p>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <h3 style={{ fontSize:12, color:'#8A7060', fontWeight:500, padding:'0 4px', marginBottom:2 }}>
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
  const [hovered, setHovered] = useState(false);
  const safety = safetyConfig[item.safety] ?? safetyConfig.safe;
  const Icon = categoryIcons[item.category] ?? FileText;

  let background: string;
  if (selected) {
    background = 'rgba(232,168,124,0.10)';
  } else if (hovered) {
    background = 'rgba(255,248,238,0.8)';
  } else {
    background = 'rgba(255,248,238,0.5)';
  }

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:'100%', display:'flex', alignItems:'flex-start', gap:12,
        padding:'10px 12px', borderRadius:12, textAlign:'left', cursor:'pointer',
        border: selected ? '1px solid rgba(232,168,124,0.3)' : '1px solid transparent',
        background,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ flexShrink:0, marginTop:2 }}>
        {selected ? (
          <CheckSquare style={{ width:16, height:16, color:'#E8A87C' }} />
        ) : (
          <Square style={{ width:16, height:16, color:'rgba(138,112,96,0.3)' }} />
        )}
      </div>

      <div style={{ padding:6, borderRadius:8, background: safety.bg, flexShrink:0 }}>
        <Icon style={{ width:16, height:16, color: safety.color }} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, color:'#3D2C1E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>
          {item.description}
        </p>
        <p style={{ fontSize:10, color:'#8A7060', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'2px 0 0 0' }}>
          {item.path}
        </p>
      </div>

      <div style={{ flexShrink:0, marginTop:2 }}>
        <span style={{ padding:'2px 6px', borderRadius:4, fontSize:10, fontWeight:500, background: safety.bg, color: safety.color }}>
          {safety.label}
        </span>
      </div>
    </button>
  );
}
