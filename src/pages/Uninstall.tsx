import { ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store";
import ScanResult from "@/components/ScanResult";
import { formatSize } from "@/lib/utils";

export default function Uninstall({ onDone }: { onDone?: () => void }) {
  const {
    selectedApp,
    uninstallPhase,
    uninstallResult,
    flowError,
    deleteResult,
    startUninstall,
    verifyAndScan,
    resetUninstall,
    deleteSelectedResidues,
    selectedResiduePaths,
    residues,
  } = useAppStore();

  if (!selectedApp) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:'0 16px', backgroundColor:'#FAF6EF' }}>
        <p style={{ color:'#8A7060', fontSize:13, margin:0 }}>没有选中的软件</p>
        <button
          onClick={resetUninstall}
          style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'#E8A87C' }}
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
    <div style={{ display:'flex', flexDirection:'column', height:'100%', width:'100%', overflow:'hidden', backgroundColor:'#FAF6EF' }}>
      {/* Header */}
      <header style={{ flexShrink:0, padding:'16px 24px 12px', display:'flex', alignItems:'center', gap:12, borderBottom:'0.5px solid #EDE0D0', backgroundColor:'#FFF8EE' }}>
        <button onClick={resetUninstall} style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'transparent', cursor:'pointer', borderRadius:8, flexShrink:0 }}>
          <ArrowLeft style={{ width:22, height:22, color:'#3D2C1E' }} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:15, fontWeight:600, color:'#3D2C1E', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedApp.name}</h1>
          <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>深度卸载</p>
        </div>
      </header>

      <main style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>
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
          <LoadingStep
            message="官方卸载向导已弹出"
            sub="请在弹出的窗口中完成卸载操作，完成后 Dusty 会自动继续"
          />
        )}

        {/* Phase: verifying */}
        {uninstallPhase === "verifying" && (
          <LoadingStep message="正在验证卸载结果…" sub="检查软件目录和注册表是否已清理" />
        )}

        {/* Phase: verify_failed */}
        {uninstallPhase === "verify_failed" && (
          <div style={{ paddingTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 40, margin: 0 }}>🤔</p>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3D2C1E', margin: 0 }}>
                卸载似乎未完成
              </p>
              <p style={{ fontSize: 12, color: '#8A7060', margin: '6px 0 0', maxWidth: 300 }}>
                软件目录或注册表记录仍然存在。可能是卸载向导被取消，或卸载程序未完全执行。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => { if (selectedApp) startUninstall(selectedApp); }}
                style={{ padding: '10px 24px', borderRadius: 12, border: 'none', backgroundColor: '#E8A87C', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                重试卸载
              </button>
              <button
                onClick={resetUninstall}
                style={{ padding: '10px 24px', borderRadius: 12, border: '0.5px solid #EDE0D0', backgroundColor: 'transparent', color: '#3D2C1E', fontSize: 13, cursor: 'pointer' }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Phase: scanning */}
        {uninstallPhase === "scanning" &&
          !residues && (
            <LoadingStep message="正在扫描残留文件…" sub="检查注册表、文件和系统项" />
          )}

        {/* Phase: review — error (scan failed, no residues) */}
        {uninstallPhase === "review" && !residues && (
          <ErrorRecoveryStep
            message={flowError ?? "扫描未能返回结果"}
            onRetry={() => {
              if (selectedApp) verifyAndScan(selectedApp);
            }}
            onCancel={resetUninstall}
          />
        )}

        {/* Phase: review residues */}
        {uninstallPhase === "review" && residues && (
          <ReviewStep
            residues={residues}
            uninstallResult={uninstallResult}
            selectedCount={selectedCount}
            totalSize={totalSize}
            onDelete={() => deleteSelectedResidues(selectedApp.name)}
            onSkip={resetUninstall}
            onScanRetry={() => { if (selectedApp) verifyAndScan(selectedApp); }}
            error={flowError}
          />
        )}

        {/* Phase: deleting */}
        {uninstallPhase === "deleting" && (
          <LoadingStep message="正在清理残留…" sub="删除注册表碎片和遗留文件" />
        )}

        {/* Phase: uninstalling error (caught mid-flight) */}
        {uninstallPhase === "uninstalling" && flowError && (
          <ErrorRecoveryStep
            message={flowError}
            onRetry={() => {
              if (selectedApp) startUninstall(selectedApp);
            }}
            onCancel={resetUninstall}
          />
        )}

        {/* Phase: done */}
        {uninstallPhase === "done" && (
          <DoneStep
            softwareName={selectedApp.name}
            deleteResult={deleteResult}
            onDone={() => { resetUninstall(); onDone?.(); }}
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
    <div style={{ paddingTop:32, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ backgroundColor:'#FFF8EE', borderRadius:16, padding:20, border:'0.5px solid #EDE0D0', display:'flex', flexDirection:'column', gap:12 }}>
        <h2 style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>确认卸载</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:13 }}>
          <InfoRow label="软件名" value={app.name} />
          {app.publisher && <InfoRow label="开发商" value={app.publisher} />}
          {app.version && <InfoRow label="版本" value={app.version} />}
          {app.install_location && (
            <InfoRow label="位置" value={app.install_location} />
          )}
        </div>
      </div>

      <p style={{ fontSize:12, color:'#8A7060', lineHeight:1.6, margin:0 }}>
        将调用官方卸载向导，请在弹出的窗口中完成操作，
        等待 Dusty 自动扫描残留并清理。
      </p>

      <div style={{
        padding: '12px 16px', borderRadius: 10,
        backgroundColor: 'rgba(224,112,96,0.08)',
        border: '0.5px solid rgba(224,112,96,0.3)',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <p style={{ fontSize: 12, color: '#E07060', margin: 0, lineHeight: 1.6 }}>
          卸载后软件将从系统移除。Dusty 会弹出官方卸载向导，
          请在弹出窗口中完成操作后等待 Dusty 自动继续。
        </p>
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, backgroundColor:'#E0706020', color:'#E07060', fontSize:12 }}>
          <AlertTriangle style={{ width:16, height:16, flexShrink:0 }} />
          {error}
        </div>
      )}

      <button
        onClick={onStart}
        style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'none', backgroundColor:'#E8A87C', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}
      >
        开始深度卸载
      </button>
    </div>
  );
}

function LoadingStep({ message, sub }: { message: string; sub: string }) {
  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, gap:16 }}
    >
      <Loader2 style={{ width:32, height:32, color:'#E8A87C' }} className="dusty-spin" />
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>{message}</p>
        <p style={{ fontSize:12, color:'#8A7060', margin:0, marginTop:4 }}>{sub}</p>
      </div>
    </div>
  );
}

function ReviewStep({
  residues,
  uninstallResult,
  selectedCount,
  totalSize,
  onDelete,
  onSkip,
  onScanRetry,
  error,
}: {
  residues: { items: { path: string; safety: string }[]; total_items: number; registry_count: number; file_count: number; system_count: number };
  uninstallResult: { success: boolean } | null;
  selectedCount: number;
  totalSize: number;
  onDelete: () => void;
  onSkip: () => void;
  onScanRetry: () => void;
  error: string | null;
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, paddingTop:16 }}>
      {/* Uninstall result banner */}
      <div
        style={{
          borderRadius:12, padding:'12px 16px', fontSize:13,
          backgroundColor: uninstallResult?.success ? '#6DBF9E20' : '#E0706020',
          color: uninstallResult?.success ? '#6DBF9E' : '#E07060',
        }}
      >
        {uninstallResult?.success
          ? "官方卸载程序已执行完成"
          : "官方卸载程序可能未完全成功"}
      </div>

      {/* Scan summary */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <StatBadge label="注册表项" count={residues.registry_count} />
        <StatBadge label="文件/文件夹" count={residues.file_count} />
        <StatBadge label="系统项" count={residues.system_count} />
      </div>

      {/* Residue list */}
      <ScanResult onRetry={onScanRetry} />

      {/* Bottom action bar */}
      <div style={{ flexShrink:0, backgroundColor:'#FAF6EF', paddingTop:12, borderTop:'0.5px solid #EDE0D0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:12, color:'#8A7060' }}>
            已选 {selectedCount} 项 · 共 {formatSize(totalSize)}
          </span>
        </div>

        {error && (
          <div style={{ marginBottom:12, fontSize:12, color:'#E07060', display:'flex', alignItems:'center', gap:4 }}>
            <AlertTriangle style={{ width:12, height:12 }} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSkip}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '0.5px solid #EDE0D0', backgroundColor: 'transparent', color: '#8A7060', fontSize: 13, cursor: 'pointer' }}
          >
            跳过，不清理
          </button>
          <button
            onClick={onDelete}
            disabled={selectedCount === 0}
            style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', backgroundColor: selectedCount === 0 ? '#EDE0D0' : '#E8A87C', color: selectedCount === 0 ? '#8A7060' : 'white', fontSize: 14, fontWeight: 600, cursor: selectedCount === 0 ? 'default' : 'pointer' }}
          >
            {selectedCount === 0 ? '请选择要清理的残留' : `清理残留 (${selectedCount}项)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorRecoveryStep({
  message,
  onRetry,
  onCancel,
}: {
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:64, gap:16 }}
    >
      <p style={{ fontSize:36, margin:0 }}>😥</p>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>呜，出了点问题…</p>
        <p style={{ fontSize:12, color:'#8A7060', margin:0, maxWidth:320, textAlign:'center' }}>
          {message}
        </p>
      </div>
      <div style={{ display:'flex', gap:12, marginTop:8 }}>
        <button onClick={onRetry} style={{ padding:'10px 24px', borderRadius:12, border:'none', backgroundColor:'#E8A87C', color:'white', fontSize:13, fontWeight:500, cursor:'pointer' }}>重试</button>
        <button onClick={onCancel} style={{ padding:'10px 24px', borderRadius:12, border:'1px solid #EDE0D0', backgroundColor:'transparent', color:'#3D2C1E', fontSize:13, fontWeight:500, cursor:'pointer' }}>取消</button>
      </div>
    </div>
  );
}

function DoneStep({
  softwareName,
  deleteResult,
  onDone,
}: {
  softwareName: string;
  deleteResult: { deleted: number; failed: number; errors: string[] } | null;
  onDone: () => void;
}) {
  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:64, gap:16, textAlign:'center' }}
    >
      <div style={{ width:64, height:64, borderRadius:'50%', backgroundColor:'#6DBF9E22', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <CheckCircle style={{ width:32, height:32, color:'#6DBF9E' }} />
      </div>
      <div>
        <h2 style={{ fontSize:17, fontWeight:600, color:'#3D2C1E', margin:0 }}>清理完成</h2>
        <p style={{ fontSize:13, color:'#8A7060', margin:0, marginTop:4 }}>
          {deleteResult
            ? `已清理 ${deleteResult.deleted} 项残留${deleteResult.failed > 0 ? `，${deleteResult.failed} 项清理失败` : ''}`
            : `${softwareName} 已卸载完成`}
        </p>
        {deleteResult && deleteResult.failed > 0 && (
          <p style={{ fontSize: 11, color: '#E07060', margin: '4px 0 0' }}>
            部分残留可能需要管理员权限才能删除
          </p>
        )}
      </div>
      <div style={{ marginTop:16, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <button
          onClick={onDone}
          style={{ padding:'10px 32px', borderRadius:12, border:'none', backgroundColor:'#E8A87C', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}
        >
          完成
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
      <span style={{ color:'#8A7060', flexShrink:0, fontSize:13 }}>{label}</span>
      <span style={{ color:'#3D2C1E', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>{value}</span>
    </div>
  );
}

function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ backgroundColor:'#FFF8EE', border:'0.5px solid #EDE0D0', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontSize:18, fontWeight:600, color:'#3D2C1E', margin:0 }}>{count}</div>
      <div style={{ fontSize:11, color:'#8A7060', margin:0 }}>{label}</div>
    </div>
  );
}
