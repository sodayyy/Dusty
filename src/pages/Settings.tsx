import { useState, useEffect } from "react";
import { ArrowLeft, Key, Eye, EyeOff, Check } from "lucide-react";
import { saveApiKey, hasApiKey, verifyApiKey } from "@/lib/ai-client";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-background">
      <header className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </header>

      <main className="flex-1 px-4 pt-4 space-y-6">
        {/* API Key section */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">AI API Key</h2>
          </div>

          <p className="text-xs text-muted-foreground">
            Optional. Enter your DeepSeek API Key to enable Dusty AI chat.
            Without a key, all core cleanup features still work.
          </p>

          <p className="text-xs text-muted-foreground/70 italic">
            The key is stored encrypted and never sent anywhere except to DeepSeek API.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={hasKey ? "Key saved (hidden)" : "sk-..."}
                className="w-full h-10 pl-3 pr-9 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!key.trim()}
              className="rounded-xl"
            >
              {saved ? <><Check /> Saved</> : "Save"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleVerify}
              disabled={!key.trim() || verifying}
              className="rounded-xl"
            >
              {verifying ? "Verifying…" : "Verify"}
            </Button>
          </div>

          {checking ? (
            <p className="text-xs text-muted-foreground">读取中…</p>
          ) : hasKey && !key ? (
            <p className="text-xs text-chart-2">
              API Key is configured. AI features are enabled.
            </p>
          ) : null}

          {saveError && (
            <p className="text-xs text-destructive">
              Save failed: {saveError}
            </p>
          )}

          {verifyResult && (
            <p
              className={`text-xs ${
                verifyResult.ok ? "text-safe" : "text-destructive"
              }`}
            >
              {verifyResult.ok ? "Key is valid" : verifyResult.msg}
            </p>
          )}
        </div>

        {/* Info */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
          <h2 className="text-sm font-medium text-foreground">About Dusty</h2>
          <p className="text-xs text-muted-foreground">Version 0.1.0</p>
          <p className="text-xs text-muted-foreground">
            A Windows cleanup tool with a cute mascot. Built with Tauri + React.
          </p>
        </div>
      </main>
    </div>
  );
}
