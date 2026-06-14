import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, HardDrive, X } from "lucide-react";
import {
  scanClassified, getAvailableDrives, getInstalledApps, detectHotspots,
  type CategorySummaryList, type AppInfo,
} from "@/lib/tauri-commands";
import { classifyFilesCached, hasApiKey, tagApps } from "@/lib/ai-client";
import { useDiskStore } from "@/store";
import DiskChart from "@/components/DiskChart";
import { catColorHex } from "@/lib/colors";
import { formatSize } from "@/lib/utils";

function buildDrivePaths(drive: string): string[] {
  const d = drive.endsWith("\\") ? drive : drive + "\\";
  return [d];
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    software: "软件程序",
    system: "系统文件",
    cache: "缓存/临时",
    documents: "文档/媒体",
    installer: "安装包",
    other: "其他",
  };
  return map[cat] ?? "其他";
}

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  游戏:     { bg: 'rgba(224,112,96,0.15)',  color: '#E07060' },
  办公:     { bg: 'rgba(109,191,158,0.15)', color: '#6DBF9E' },
  浏览器:   { bg: 'rgba(100,160,220,0.15)', color: '#64A0DC' },
  开发工具: { bg: 'rgba(109,191,158,0.15)', color: '#6DBF9E' },
  系统组件: { bg: 'rgba(138,112,96,0.12)',  color: '#8A7060' },
  媒体:     { bg: 'rgba(232,168,124,0.15)', color: '#E8A87C' },
  安全:     { bg: 'rgba(240,192,112,0.15)', color: '#F0C070' },
  其他:     { bg: 'rgba(138,112,96,0.08)',  color: '#8A7060' },
};

const LARGE_FILE_CATEGORY_LABEL: Record<string, string> = {
  documents: '文档/媒体',
  cache:     '缓存',
  installer: '安装包',
  other:     '其他',
};

export default function DiskClean({ onBack }: { onBack: () => void }) {
  const {
    diskScanCache, diskHotspots, hotspotsFetched,
    selectedDrive, appTagCache,
    setDiskScanCache, setDiskHotspots, setSelectedDrive, setAppTagCache,
  } = useDiskStore();

  const [drives, setDrives] = useState<string[]>([]);
  const [data, setData] = useState<CategorySummaryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [allApps, setAllApps] = useState<AppInfo[]>([]);
  const [tagging, setTagging] = useState(false);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [hotspotOpen, setHotspotOpen] = useState(false);
  const [largeFilesOpen, setLargeFilesOpen] = useState(false);
  const [softwareOpen, setSoftwareOpen] = useState(false);

  const drilledData = data?.summaries.find((s) => s.category === drilledCategory) ?? null;

  const driveApps = allApps.filter((app) => {
    if (!selectedDrive || !app.install_location) return false;
    const norm = app.install_location.toUpperCase();
    const driveNorm = selectedDrive.replace('\\', '').toUpperCase();
    return norm.startsWith(driveNorm);
  });

  const enhanceWithAI = async (currentData: CategorySummaryList) => {
    if (aiEnhancing || aiEnhanced) return;
    const hasKey = await hasApiKey();
    if (!hasKey) return;

    const otherSummary = currentData.summaries.find((s) => s.category === "other");
    if (!otherSummary || otherSummary.item_count === 0) return;

    const pathsToClassify = currentData.scanned_paths;
    if (pathsToClassify.length === 0) return;

    setAiEnhancing(true);
    try {
      const results = await classifyFilesCached(pathsToClassify);

      const newSummaries = [...currentData.summaries];
      const otherIdx = newSummaries.findIndex((s) => s.category === "other");
      if (otherIdx === -1) return;

      for (const r of results) {
        if (r.category === "other" || !r.category) continue;
        const existing = newSummaries.find((s) => s.category === r.category);
        const sizePerItem = otherSummary.total_size_kb / otherSummary.item_count;
        if (existing) {
          existing.total_size_kb += sizePerItem;
          existing.item_count += 1;
        } else {
          newSummaries.push({
            category: r.category,
            category_cn: categoryLabel(r.category),
            total_size_kb: sizePerItem,
            item_count: 1,
            safety: r.safety ?? "caution",
          });
        }
        newSummaries[otherIdx].total_size_kb -= sizePerItem;
        newSummaries[otherIdx].item_count -= 1;
      }

      const filtered = newSummaries
        .filter((s) => s.item_count > 0)
        .sort((a, b) => b.total_size_kb - a.total_size_kb);

      setData({ ...currentData, summaries: filtered });
      setAiEnhanced(true);
    } catch (e) {
      console.error("[DiskClean] AI enhance error:", e);
    } finally {
      setAiEnhancing(false);
    }
  };

  useEffect(() => {
    getAvailableDrives().then((list) => {
      setDrives(list);
      if (list.length > 0 && !selectedDrive) {
        setSelectedDrive(list[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedDrive) return;

    if (diskScanCache[selectedDrive]) {
      setData(diskScanCache[selectedDrive]);
      setLoading(false);
      setError(null);

      if (!hotspotsFetched) {
        setHotspotLoading(true);
        detectHotspots()
          .then((items) => setDiskHotspots(items))
          .catch(() => {})
          .finally(() => setHotspotLoading(false));
      }

      getInstalledApps()
        .then((list) => {
          setAllApps(list);
          hasApiKey().then((has) => {
            if (!has) return;
            setTagging(true);
            tagApps(list.map((a) => ({ name: a.name, publisher: a.publisher })))
              .then((tags) => setAppTagCache(tags))
              .catch(() => {})
              .finally(() => setTagging(false));
          });
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setAllApps([]);
    setAiEnhanced(false);
    setAiEnhancing(false);

    const drivePaths = buildDrivePaths(selectedDrive);

    if (!hotspotsFetched) {
      setHotspotLoading(true);
      detectHotspots()
        .then((items) => setDiskHotspots(items))
        .catch(() => {})
        .finally(() => setHotspotLoading(false));
    }

    Promise.all([
      scanClassified(drivePaths),
      getInstalledApps().catch(() => [] as AppInfo[]),
    ])
      .then(([scanResult, appList]) => {
        setData(scanResult);
        setAllApps(appList);
        setDiskScanCache(selectedDrive, scanResult);
        setTimeout(() => enhanceWithAI(scanResult), 500);
        if (appList.length > 0) {
          hasApiKey().then((has) => {
            if (!has) return;
            setTagging(true);
            tagApps(appList.map((a) => ({ name: a.name, publisher: a.publisher })))
              .then((tags) => setAppTagCache(tags))
              .catch((e) => console.error("[DiskClean] tagApps:", e))
              .finally(() => setTagging(false));
          });
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [selectedDrive, retryCount]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', width:'100%', overflow:'hidden', backgroundColor:'#FAF6EF' }}>
      <header style={{ flexShrink:0, padding:'16px 24px 12px', display:'flex', alignItems:'flex-start', gap:12, borderBottom:'0.5px solid #EDE0D0', backgroundColor:'#FFF8EE' }}>
        <button
          onClick={onBack}
          style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'transparent', cursor:'pointer', borderRadius:8, flexShrink:0, marginTop:2 }}
        >
          <ArrowLeft style={{ width:22, height:22, color:'#3D2C1E' }} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:17, fontWeight:600, color:'#3D2C1E', margin:0 }}>
            磁盘成分分析
          </h1>
          {drives.length > 0 && (
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              {drives.map((drive) => (
                <button
                  key={drive}
                  onClick={() => setSelectedDrive(drive)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: '0.5px solid',
                    borderColor: selectedDrive === drive ? '#E8A87C' : '#EDE0D0',
                    background: selectedDrive === drive ? 'rgba(232,168,124,0.12)' : '#FAF6EF',
                    color: selectedDrive === drive ? '#E8A87C' : '#8A7060',
                    fontSize: 12,
                    fontWeight: selectedDrive === drive ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {drive.replace("\\", "")}
                </button>
              ))}
            </div>
          )}
          {data && (
            <p style={{ fontSize:12, color:'#8A7060', margin:'8px 0 0 0' }}>
              共 {formatSize(data.total_size_kb)}
              &nbsp;·&nbsp;
              扫描了 {data.scanned_paths.length} 个目录
            </p>
          )}
          {data && data.scanned_paths.length > 0 && (
            <p style={{ fontSize:10, color:'#8A7060', margin:'2px 0 0 0',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        maxWidth: 600 }}>
              {data.scanned_paths.join('  ·  ')}
            </p>
          )}
        </div>
      </header>

      <main style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, gap:16 }}>
            <Loader2 style={{ width:32, height:32, color:'#E8A87C' }} className="dusty-spin" />
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>正在扫描 {selectedDrive?.replace("\\", "")} 盘…</p>
              <p style={{ fontSize:12, color:'#8A7060', margin:0, marginTop:4 }}>这可能需要几秒钟</p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, gap:12 }}>
            <p style={{ fontSize:13, color:'#E07060', margin:0 }}>{error}</p>
            <button
              onClick={() => {
                if (selectedDrive) {
                  useDiskStore.setState((s) => {
                    const c = { ...s.diskScanCache };
                    delete c[selectedDrive];
                    return { diskScanCache: c };
                  });
                }
                setRetryCount((c) => c + 1);
              }}
              style={{ background:'#E8A87C', color:'white', border:'none', borderRadius:8, padding:'8px 20px', fontSize:13, cursor:'pointer' }}
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && data && data.summaries.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, gap:8 }}>
            <HardDrive style={{ width:32, height:32, color:'rgba(138,112,96,0.4)' }} />
            <p style={{ fontSize:13, color:'#8A7060', margin:0 }}>未扫描到数据</p>
          </div>
        )}

        {!loading && !error && data && data.summaries.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:20, paddingTop:16 }}>
            <DiskChart
              data={data.summaries}
              totalSize={data.total_size_kb}
              drilledCategory={drilledCategory}
              onDrill={(cat) =>
                setDrilledCategory(drilledCategory === cat ? null : cat)
              }
            />

            {/* ── 缓存热点卡片 ── */}
            {(hotspotLoading || diskHotspots.length > 0) && (
              <div style={{ borderRadius:12, border:'0.5px solid #EDE0D0', overflow:'hidden', backgroundColor:'#FFF8EE', marginTop:12 }}>
                <button
                  onClick={() => setHotspotOpen((v) => !v)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left' }}
                >
                  <span style={{ fontSize:16 }}>🧹</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E' }}>缓存热点</span>
                    <span style={{
                      fontSize: 10, color: '#8A7060',
                      backgroundColor: 'rgba(138,112,96,0.08)',
                      borderRadius: 6, padding: '1px 6px', marginLeft: 6,
                    }}>
                      全盘检测，与所选盘符无关
                    </span>
                    <span style={{ fontSize:12, color:'#8A7060', marginLeft:8 }}>
                      {hotspotLoading ? '检测中…' : `${diskHotspots.length} 个`}
                    </span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color:'#E07060', flexShrink:0 }}>
                    {diskHotspots.length > 0 ? formatSize(diskHotspots.reduce((s, h) => s + h.size_kb, 0)) : ''}
                  </span>
                  <span style={{ fontSize:10, color:'#8A7060', marginLeft:8, flexShrink:0 }}>
                    {hotspotOpen ? '▲' : '▼'}
                  </span>
                </button>
                {hotspotOpen && (
                  <div style={{ borderTop:'0.5px solid #EDE0D0', maxHeight:280, overflowY:'auto' }}>
                    {diskHotspots.map((h) => (
                      <div key={h.path} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 16px', borderBottom:'0.5px solid rgba(237,224,208,0.5)' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:500, color:'#3D2C1E', margin:0 }}>{h.name}</p>
                          <p style={{ fontSize:10, color:'#8A7060', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.path}</p>
                          <p style={{ fontSize:10, color:'#8A7060', margin:'1px 0 0' }}>{h.description}</p>
                        </div>
                        <span style={{ fontSize:11, fontWeight:500, color:'#E07060', flexShrink:0, marginTop:2 }}>
                          {formatSize(h.size_kb)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 大型文件卡片 ── */}
            {data && data.large_files && data.large_files.length > 0 && (
              <div style={{ borderRadius:12, border:'0.5px solid #EDE0D0', overflow:'hidden', backgroundColor:'#FFF8EE', marginTop:8 }}>
                <button
                  onClick={() => setLargeFilesOpen((v) => !v)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left' }}
                >
                  <span style={{ fontSize:16 }}>📦</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E' }}>大型文件</span>
                    <span style={{ fontSize:12, color:'#8A7060', marginLeft:8 }}>{data.large_files.length} 个（＞100 MB）</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', flexShrink:0 }}>
                    {formatSize(data.large_files.reduce((s, f) => s + f.size_kb, 0))}
                  </span>
                  <span style={{ fontSize:10, color:'#8A7060', marginLeft:8, flexShrink:0 }}>
                    {largeFilesOpen ? '▲' : '▼'}
                  </span>
                </button>
                {largeFilesOpen && (
                  <div style={{ borderTop:'0.5px solid #EDE0D0', maxHeight:320, overflowY:'auto' }}>
                    {data.large_files.map((f) => (
                      <div key={f.path} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderBottom:'0.5px solid rgba(237,224,208,0.5)' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:500, color:'#3D2C1E', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</p>
                          <p style={{ fontSize:10, color:'#8A7060', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.path}</p>
                        </div>
                        <span style={{ padding:'2px 7px', borderRadius:10, fontSize:10, backgroundColor:'rgba(138,112,96,0.08)', color:'#8A7060', flexShrink:0 }}>
                          {LARGE_FILE_CATEGORY_LABEL[f.category] ?? '其他'}
                        </span>
                        <span style={{ fontSize:11, fontWeight:500, color:'#3D2C1E', flexShrink:0, marginLeft:4 }}>
                          {formatSize(f.size_kb)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 已安装软件卡片 ── */}
            {allApps.length > 0 && (
              <div style={{ borderRadius:12, border:'0.5px solid #EDE0D0', overflow:'hidden', backgroundColor:'#FFF8EE', marginTop:8 }}>
                <button
                  onClick={() => setSoftwareOpen((v) => !v)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left' }}
                >
                  <span style={{ fontSize:16 }}>🗂</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E' }}>可卸载软件</span>
                    <span style={{ fontSize:12, color:'#8A7060', marginLeft:8 }}>{driveApps.length} 个</span>
                    {tagging && <span style={{ fontSize:10, color:'#E8A87C', marginLeft:8 }}>✦ AI 标注中…</span>}
                    {!tagging && Object.keys(appTagCache).length > 0 && <span style={{ fontSize:10, color:'#6DBF9E', marginLeft:8 }}>✦ AI 已标注</span>}
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', flexShrink:0 }}>
                    {formatSize(driveApps.reduce((s, a) => s + (a.size_kb ?? 0), 0))}
                  </span>
                  <span style={{ fontSize:10, color:'#8A7060', marginLeft:8, flexShrink:0 }}>
                    {softwareOpen ? '▲' : '▼'}
                  </span>
                </button>
                {softwareOpen && (
                  <div style={{ borderTop:'0.5px solid #EDE0D0', maxHeight:360, overflowY:'auto' }}>
                    <p style={{
                      fontSize: 11, color: '#8A7060', margin: '0',
                      padding: '6px 16px 4px',
                      borderBottom: '0.5px solid rgba(237,224,208,0.3)',
                    }}>
                      来自系统安装记录，不含绿色软件和部分游戏。想查看磁盘实际占用请看下方「分类明细·软件程序」
                    </p>
                    {driveApps.length === 0 ? (
                      <p style={{ fontSize:12, color:'#8A7060', padding:'16px', textAlign:'center', margin:0 }}>此盘未发现可卸载软件</p>
                    ) : (
                      driveApps
                        .slice()
                        .sort((a, b) => (b.size_kb ?? 0) - (a.size_kb ?? 0))
                        .map((app) => {
                          const tag = appTagCache[app.name];
                          const tagStyle = tag ? (TAG_COLORS[tag] ?? TAG_COLORS['其他']) : null;
                          return (
                            <div key={app.name + (app.install_location ?? '')} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderBottom:'0.5px solid rgba(237,224,208,0.5)' }}>
                              <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, backgroundColor:'rgba(100,160,220,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#64A0DC' }}>
                                {app.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:12, fontWeight:500, color:'#3D2C1E', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{app.name}</p>
                                {app.publisher && (
                                  <p style={{ fontSize:10, color:'#8A7060', margin:'1px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{app.publisher}</p>
                                )}
                              </div>
                              {tagStyle && (
                                <span style={{ padding:'2px 7px', borderRadius:10, fontSize:10, fontWeight:500, flexShrink:0, backgroundColor:tagStyle.bg, color:tagStyle.color }}>
                                  {tag}
                                </span>
                              )}
                              <span style={{ fontSize:11, color:'#8A7060', flexShrink:0, marginLeft:4 }}>
                                {(app.size_kb ?? 0) > 0 ? formatSize(app.size_kb) : '未知'}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 4px', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#8A7060', fontWeight:500 }}>分类明细</span>
                {aiEnhancing && (
                  <span style={{ fontSize:10, color:'#E8A87C' }}>✦ Dusty AI 正在分析…</span>
                )}
                {aiEnhanced && !aiEnhancing && (
                  <span style={{ fontSize:10, color:'#6DBF9E' }}>✦ AI 已增强</span>
                )}
              </div>
              {data.summaries.map((cat) => (
                <div
                  key={cat.category}
                  style={{ display:'flex', alignItems:'center', gap:12, borderRadius:12, padding:'12px 16px', backgroundColor:'#FFF8EE', border:'0.5px solid #EDE0D0', overflow:'hidden' }}
                >
                  <div
                    style={{ width:12, height:12, borderRadius:'50%', flexShrink:0, backgroundColor: catColorHex(cat.category) }}
                  />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>
                      {cat.category_cn}
                    </p>
                    <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>
                      {cat.item_count} 项
                    </p>
                  </div>
                  <div style={{ flexShrink:0, width:100, textAlign:'right' }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>
                      {formatSize(cat.total_size_kb)}
                    </p>
                    <div style={{ position:'relative', width:72, height:4, borderRadius:2, backgroundColor:'#EDE0D0', marginTop:4, marginLeft:'auto' }}>
                      <div style={{
                        position:'absolute', left:0, top:0, height:'100%', borderRadius:2,
                        width: `${data.total_size_kb > 0 ? Math.min((cat.total_size_kb / data.total_size_kb) * 100, 100) : 0}%`,
                        backgroundColor: catColorHex(cat.category),
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Drill-down detail panel */}
              {drilledData && (
                <div
                  style={{ backgroundColor:'#FFF8EE', borderRadius:16, border:'0.5px solid #EDE0D0', padding:20, display:'flex', flexDirection:'column', gap:16 }}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div
                        style={{ width:12, height:12, borderRadius:'50%', flexShrink:0, backgroundColor: catColorHex(drilledData.category) }}
                      />
                      <span style={{ fontSize:13, fontWeight:500, color:'#3D2C1E' }}>{drilledData.category_cn}</span>
                    </div>
                    <button
                      onClick={() => setDrilledCategory(null)}
                      style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'transparent', cursor:'pointer', borderRadius:6, flexShrink:0 }}
                    >
                      <X style={{ width:16, height:16, color:'#3D2C1E' }} />
                    </button>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div style={{ backgroundColor:'#FAF6EF', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                      <p style={{ fontSize:16, fontWeight:600, color:'#3D2C1E', margin:0 }}>{formatSize(drilledData.total_size_kb)}</p>
                      <p style={{ fontSize:11, color:'#8A7060', margin:0 }}>占用空间</p>
                    </div>
                    <div style={{ backgroundColor:'#FAF6EF', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                      <p style={{ fontSize:16, fontWeight:600, color:'#3D2C1E', margin:0 }}>{drilledData.item_count}</p>
                      <p style={{ fontSize:11, color:'#8A7060', margin:0 }}>文件/文件夹数</p>
                    </div>
                  </div>

                  <div style={{ backgroundColor:'#FAF6EF', borderRadius:12, padding:'12px 16px' }}>
                    <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>
                      此分类包含 {drilledData.item_count} 个项目，建议先预览再决定是否清理。
                    </p>
                  </div>
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
