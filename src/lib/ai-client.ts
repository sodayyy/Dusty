import { Store } from "@tauri-apps/plugin-store";

const STORE_PATH = "dusty-settings.json";
const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

async function getApiKey(): Promise<string | null> {
  const store = await Store.load(STORE_PATH);
  return (await store.get<string>("apiKey")) ?? null;
}

export async function saveApiKey(key: string): Promise<void> {
  const store = await Store.load(STORE_PATH);
  await store.set("apiKey", key);
  await store.save();
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.trim().length > 0;
}

async function callDeepseek(
  messages: { role: string; content: string }[],
  temperature = 0.3
): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new Error("API Key not configured");

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Layer A: File classification ──

interface ClassifyResult {
  path: string;
  category: string;
  safety: string;
}

const CLASSIFY_PROMPT = `You are a file classification expert. Classify each Windows file path into one category and safety level.

Categories: software (Program Files), system (Windows/System32), cache (Temp/tmp), documents (Docs/Desktop/media), installer (exe/msi/iso), other.

Safety: safe (can delete), caution (consider carefully), never (system-critical).

Return ONLY a JSON array: [{"path":"...","category":"...","safety":"..."}]`;

export async function classifyFiles(
  paths: string[]
): Promise<ClassifyResult[]> {
  const batch = paths.slice(0, 30);
  const fileList = batch.map((p) => `- ${p}`).join("\n");

  const text = await callDeepseek([
    { role: "system", content: CLASSIFY_PROMPT },
    { role: "user", content: `Classify these files:\n${fileList}` },
  ]);

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

// Simple in-memory cache
const classifyCache = new Map<string, ClassifyResult>();

export async function classifyFilesCached(
  paths: string[]
): Promise<ClassifyResult[]> {
  const uncached = paths.filter((p) => !classifyCache.has(p));
  if (uncached.length === 0) {
    return paths.map((p) => classifyCache.get(p)!);
  }
  const results = await classifyFiles(uncached);
  for (const r of results) {
    classifyCache.set(r.path, r);
  }
  return paths.map(
    (p) =>
      classifyCache.get(p) ?? {
        path: p,
        category: "other",
        safety: "caution",
      }
  );
}

// ── Layer B: Dusty Chat ──

const DUSTY_SYSTEM_PROMPT = `You are Dusty, a cute Windows disk cleanup assistant mascot. A little character with a broom.

Current context:
- User is cleaning: {software_name}
- Scan found: {residue_summary}
- Current stage: {current_stage}

Rules:
1. Only answer questions directly related to the current cleanup task.
2. If the user asks anything else, reply with exactly this text (no variations):
"Hey, Dusty only knows about cleaning stuff! I can't help with other things~"
3. For serious risks (like deleting system files), switch to a serious tone:
"Warning: {risk description}. Deleting these files may affect system stability. Please decide carefully."
4. Normal replies: cute, lively tone. End sentences with "~" or "yo" occasionally.
5. Keep replies short (2-3 sentences max).
6. Reply in the same language the user uses (Chinese → Chinese, English → English).`;

export interface ChatContext {
  softwareName: string;
  residueSummary: string;
  currentStage: string;
}

export async function dustyChat(
  userMessage: string,
  context: ChatContext,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const systemPrompt = DUSTY_SYSTEM_PROMPT.replace(
    "{software_name}",
    context.softwareName
  )
    .replace("{residue_summary}", context.residueSummary)
    .replace("{current_stage}", context.currentStage);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10), // last 10 messages
    { role: "user", content: userMessage },
  ];

  return callDeepseek(messages, 0.7);
}

export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  residue: [
    "这些文件都能删吗？",
    "哪些我必须留着？",
    "帮我总结一下扫到了什么",
  ],
  diskanalysis: [
    "哪类文件占了最多空间？",
    "有什么可以马上清理的？",
    "这个文件夹是干什么用的？",
  ],
};
