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

export async function verifyApiKey(key?: string): Promise<string> {
  const k = key ?? (await getApiKey());
  if (!k?.trim()) throw new Error("No API Key provided");

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${k}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error("API Key is invalid (401 Unauthorized)");
    throw new Error(`Verification failed: ${res.status} ${err.slice(0, 100)}`);
  }

  return "Key verified successfully";
}

async function callDeepseek(
  messages: { role: string; content: string }[],
  temperature = 0.3,
  maxRetries = 2
): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new Error("API Key not configured");

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`DeepSeek API error ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";

    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message.toLowerCase();

      if (
        msg.includes("401") ||
        msg.includes("400") ||
        msg.includes("api key")
      ) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError;
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
6. When the user asks whether a selected software is safe to delete or uninstall:
   - Check the software name and publisher for clues.
   - If the name contains keywords like "Driver", "Chipset", "Intel", "AMD", "NVIDIA",
     "Runtime", "Redistributable", "Framework", ".NET", "Visual C++", "DirectX",
     "Management Engine", "Serial IO", "Graphics", "Audio", "Realtek", "Synaptics",
     reply that this is likely a system component or driver, and advise the user NOT
     to uninstall it unless they know exactly what they are doing.
   - If the software is a known user application (game, productivity app, browser),
     reply that it is generally safe to uninstall.
   - If uncertain, advise caution and suggest checking the publisher's website.
7. Reply in the same language the user uses (Chinese → Chinese, English → English).`;

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

// ── Layer C: Software tagging ──

export interface AppTag {
  name: string;
  tag: string;
}

const TAG_PROMPT = `你是一个 Windows 软件分类专家。
请给以下软件逐一打一个分类标签，只能从这8个中选一个：
游戏、办公、浏览器、开发工具、系统组件、媒体、安全、其他。

只返回 JSON 数组，不要任何其他文字，格式：
[{"name":"软件名","tag":"标签"}]

软件列表：
{list}`;

const tagCache = new Map<string, string>();

export async function tagApps(
  apps: { name: string; publisher: string }[]
): Promise<Record<string, string>> {
  const uncached = apps.filter((a) => !tagCache.has(a.name));
  if (uncached.length === 0) {
    const result: Record<string, string> = {};
    for (const a of apps) result[a.name] = tagCache.get(a.name) ?? "其他";
    return result;
  }

  const batch = uncached.slice(0, 60);
  const list = batch.map((a) => `- ${a.name}（${a.publisher || "未知发行商"}）`).join("\n");

  const prompt = TAG_PROMPT.replace("{list}", list);

  let raw = "";
  try {
    raw = await callDeepseek([{ role: "user", content: prompt }], 0.1);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no json");
    const parsed: AppTag[] = JSON.parse(match[0]);
    for (const item of parsed) {
      if (item.name && item.tag) tagCache.set(item.name, item.tag);
    }
  } catch (e) {
    console.error("[tagApps] parse error:", e, raw);
  }

  const result: Record<string, string> = {};
  for (const a of apps) result[a.name] = tagCache.get(a.name) ?? "其他";
  return result;
}
