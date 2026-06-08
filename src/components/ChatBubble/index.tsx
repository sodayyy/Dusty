import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { dustyChat, hasApiKey, SUGGESTED_QUESTIONS } from "@/lib/ai-client";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedApp = useAppStore((s) => s.selectedApp);
  const residues = useAppStore((s) => s.residues);

  useEffect(() => {
    hasApiKey().then(setHasKey);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const context = {
    softwareName: selectedApp?.name ?? "disk cleanup",
    residueSummary: residues
      ? `${residues.total_items} residues found, ${residues.registry_count} registry + ${residues.file_count} files + ${residues.system_count} system items`
      : "No scan yet",
    currentStage: residues ? "residue_review" : "app_selection",
  };

  const questions =
    SUGGESTED_QUESTIONS[residues ? "residue" : "diskanalysis"] ?? [];

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await dustyChat(msg, context, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Oops, something went wrong: ${e}. Please check your API Key in Settings.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-40px)] h-[480px] max-h-[calc(100vh-120px)] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="text-base">🧹</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Dusty</p>
                <p className="text-2xs text-muted-foreground">
                  Your cleanup assistant
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Hi! I'm Dusty, your cleanup buddy~
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask me anything about the cleanup!
                  </p>
                  <div className="mt-4 space-y-1.5">
                    {questions.map((q) => (
                      <Button
                        key={q}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSend(q)}
                        className="w-full justify-start text-xs"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Dusty is thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-2 border-t border-border flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask Dusty..."
                className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                <Send />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
