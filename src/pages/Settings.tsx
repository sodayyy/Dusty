import { useState, useEffect } from "react";
import { ArrowLeft, Key, Eye, EyeOff } from "lucide-react";
import { saveApiKey, hasApiKey, verifyApiKey } from "@/lib/ai-client";

export default function Settings({ onBack }: { onBack: () => void }) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    hasApiKey()
      .then(setHasKey)
      .finally(() => setChecking(false));
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await saveApiKey(key.trim());
      setHasKey(key.trim().length > 0);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(String(e));
    }
  };

  const handleVerify = async () => {
    setVerifyResult(null);
    setVerifying(true);
    try {
      await verifyApiKey(key.trim() || undefined);
      setVerifyResult({ ok: true, msg: "Key is valid" });
    } catch (e) {
      setVerifyResult({ ok: false, msg: String(e) });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', width:'100%', overflow:'hidden', backgroundColor:'#FAF6EF' }}>
      <header style={{ flexShrink:0, padding:'16px 24px 12px', display:'flex', alignItems:'center', gap:12, borderBottom:'0.5px solid #EDE0D0', backgroundColor:'#FFF8EE' }}>
        <button onClick={onBack} style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'transparent', cursor:'pointer', borderRadius:8, flexShrink:0 }}>
          <ArrowLeft style={{ width:22, height:22, color:'#3D2C1E' }} />
        </button>
        <h1 style={{ fontSize:15, fontWeight:600, color:'#3D2C1E', margin:0 }}>设置</h1>
      </header>

      <main style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ backgroundColor:'#FFF8EE', borderRadius:16, border:'0.5px solid #EDE0D0', padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Key style={{ width:16, height:16, color:'#E8A87C' }} />
            <h2 style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>AI API Key</h2>
          </div>

          <p style={{ fontSize:12, color:'#8A7060', margin:0, lineHeight:1.6 }}>
            Optional. Enter your DeepSeek API Key to enable Dusty AI chat.
            Without a key, all core cleanup features still work.
          </p>

          <p style={{ fontSize:12, color:'#8A7060', margin:0, fontStyle:'italic' }}>
            The key is stored encrypted and never sent anywhere except to DeepSeek API.
          </p>

          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative', flex:1 }}>
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={hasKey ? "Key saved (hidden)" : "sk-..."}
                style={{ width:'100%', height:40, paddingLeft:12, paddingRight:36, borderRadius:10, backgroundColor:'#FAF6EF', border:'1px solid #EDE0D0', fontSize:13, color:'#3D2C1E', outline:'none', boxSizing:'border-box' }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', padding:4, color:'#8A7060' }}
              >
                {showKey ? (
                  <EyeOff style={{ width:16, height:16 }} />
                ) : (
                  <Eye style={{ width:16, height:16 }} />
                )}
              </button>
            </div>
            <button onClick={handleSave} disabled={!key.trim()} style={{ padding:'0 16px', height:40, borderRadius:10, border:'none', backgroundColor: key.trim() ? '#E8A87C' : '#EDE0D0', color: key.trim() ? 'white' : '#8A7060', fontSize:13, fontWeight:500, cursor: key.trim() ? 'pointer' : 'default', flexShrink:0 }}>
              {saved ? '已保存 ✓' : '保存'}
            </button>
            <button onClick={handleVerify} disabled={!key.trim() || verifying} style={{ padding:'0 16px', height:40, borderRadius:10, border:'1px solid #EDE0D0', backgroundColor:'transparent', color:'#3D2C1E', fontSize:13, fontWeight:500, cursor: key.trim() && !verifying ? 'pointer' : 'default', flexShrink:0 }}>
              {verifying ? '验证中…' : '验证'}
            </button>
          </div>

          {checking ? (
            <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>读取中…</p>
          ) : hasKey && !key ? (
            <p style={{ fontSize:12, color:'#6DBF9E', margin:0 }}>
              API Key is configured. AI features are enabled.
            </p>
          ) : null}

          {saveError && (
            <p style={{ fontSize:12, color:'#E07060', margin:0 }}>
              Save failed: {saveError}
            </p>
          )}

          {verifyResult && (
            <p style={{ fontSize:12, color: verifyResult.ok ? '#6DBF9E' : '#E07060', margin:0 }}>
              {verifyResult.ok ? "Key is valid" : verifyResult.msg}
            </p>
          )}
        </div>

        <div style={{ backgroundColor:'#FFF8EE', borderRadius:16, border:'0.5px solid #EDE0D0', padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>
                新手引导
              </p>
              <p style={{ fontSize:11, color:'#8A7060', margin:'2px 0 0' }}>
                下次启动时重新显示引导页
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('dusty-onboarded');
              }}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12,
                border: '0.5px solid #EDE0D0',
                background: '#FAF6EF', color: '#8A7060',
                cursor: 'pointer',
              }}
            >
              重置引导
            </button>
          </div>
        </div>

        <div style={{ backgroundColor:'#FFF8EE', borderRadius:16, border:'0.5px solid #EDE0D0', padding:20, display:'flex', flexDirection:'column', gap:8 }}>
          <h2 style={{ fontSize:13, fontWeight:500, color:'#3D2C1E', margin:0 }}>About Dusty</h2>
          <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>Version 0.1.0</p>
          <p style={{ fontSize:12, color:'#8A7060', margin:0 }}>
            A Windows cleanup tool with a cute mascot. Built with Tauri + React.
          </p>
        </div>
      </main>
    </div>
  );
}
