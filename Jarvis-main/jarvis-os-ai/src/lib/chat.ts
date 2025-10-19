export const CHAT_API_BASE = import.meta.env.VITE_CHAT_API_URL || "http://localhost:8002";

export type ChatSource = {
  id?: string;
  text: string;
  score?: number;
  origin?: string;
  document_id?: string | null;
};

export type RagMeta = {
  count: number;
  time_ms: number;
};

export type LlmMeta = {
  time_ms: number;
  error?: string | null;
  model?: string | null;
};

export type ChatMeta = {
  rag?: RagMeta;
  llm?: LlmMeta;
};

export async function chatAsk(message: string): Promise<{ answer: string; sources: ChatSource[]; meta?: ChatMeta }>{
  const res = await fetch(`${CHAT_API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Chat request failed (${res.status})`);
  }
  return res.json();
}
