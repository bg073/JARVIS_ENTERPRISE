import { useState, useRef, useEffect } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Send } from "lucide-react";
import { chatAsk, ChatMeta, ChatSource } from "@/lib/chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Vision. Tell me anything and I'll echo it back for now." },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [lastMeta, setLastMeta] = useState<ChatMeta | null>(null);
  const [lastSources, setLastSources] = useState<ChatSource[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await chatAsk(userMsg.content);
      const answer = res.answer || "(no response)";
      const cite = res.sources && res.sources.length
        ? `\n\nSources: ${res.sources.map((s, i) => `[S${i+1}]`).join(" ")}`
        : "";
      setLastMeta(res.meta || null);
      setLastSources(res.sources || []);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${answer}${cite}` },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err?.message || 'failed to get answer'}` },
      ]);
    }
  };

  return (
    <div className="relative space-y-10">
      <AnimatedBackground />

      {/* Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                Vision Chat
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">ALPHA</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Conversational interface prototype</p>
      </div>

      {/* AI Brain Visual */}
      <div className="relative z-10">
        <Card className="p-12 border-border/30 bg-transparent overflow-hidden text-center">
          <div className="mx-auto relative w-64 h-64">
            {/* Glow layers */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-[60px] animate-[pulse_4s_ease-in-out_infinite]" />

            {/* Concentric pulsing rings */}
            <div className="absolute inset-0 rounded-full border border-primary/30" />
            <div className="absolute inset-2 rounded-full border border-primary/20 animate-[pulse_2.8s_ease-in-out_infinite]" />
            <div className="absolute inset-4 rounded-full border border-primary/10 animate-[pulse_3.6s_ease-in-out_infinite]" />

            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 rounded-full opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent 0, transparent 14px, rgba(255,255,255,0.05) 15px), repeating-linear-gradient(90deg, transparent 0, transparent 14px, rgba(255,255,255,0.05) 15px)'
              }}
            />

            {/* Brain icon (no rotation) */}
            <div className="relative w-full h-full flex items-center justify-center">
              <BrainCircuit className="w-28 h-28 text-primary drop-shadow-[0_0_18px_hsl(var(--primary))]" />
            </div>

            {/* Floating particles */}
            <div className="absolute -top-2 left-1/4 w-2 h-2 bg-primary/60 rounded-full animate-ping" />
            <div className="absolute -bottom-1 right-1/3 w-2 h-2 bg-accent/60 rounded-full animate-ping" />
            <div className="absolute top-1/3 -left-1 w-2 h-2 bg-primary/50 rounded-full animate-ping" />
          </div>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="relative z-20 grid grid-rows-[1fr_auto] gap-4">
        <Card className="p-4 h-[46vh] overflow-hidden border-border/40"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card) / 0.35) 0%, hsl(var(--card) / 0.2) 100%)' }}>
          <div ref={listRef} className="h-full overflow-y-auto pr-2 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                <div className={`px-4 py-2 rounded-xl border text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'bg-primary/15 border-primary/30 text-foreground'
                    : 'bg-card/60 border-border/30 text-muted-foreground'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Process details (RAG + LLM) */}
        {lastMeta && (
          <Card className="p-3 border-border/40 text-xs space-y-2" style={{ background: 'linear-gradient(135deg, hsl(var(--card) / 0.45) 0%, hsl(var(--card) / 0.25) 100%)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-foreground/80">Process</span>
              <span className="text-muted-foreground">RAG: {lastMeta.rag ? `${lastMeta.rag.count} snippets in ${Math.round(lastMeta.rag.time_ms)}ms` : 'no context'}</span>
              <span className="text-muted-foreground">LLM: {lastMeta.llm ? `${lastMeta.llm.model || 'model'} in ${Math.round(lastMeta.llm.time_ms)}ms` : 'n/a'}</span>
              {lastMeta.llm?.error && (
                <span className="text-destructive">LLM error: {lastMeta.llm.error}</span>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowDetails((v) => !v)}>
                {showDetails ? 'Hide sources' : 'View sources'}
              </Button>
            </div>
            {showDetails && (
              <div className="max-h-40 overflow-auto space-y-2">
                {lastSources && lastSources.length ? lastSources.map((s, i) => (
                  <div key={i} className="px-3 py-2 rounded-md border border-border/30 bg-card/60">
                    <div className="text-foreground/80 font-medium mb-1">[S{i+1}] {s.origin || s.document_id || s.id || 'source'}</div>
                    <div className="text-muted-foreground">{s.text}</div>
                  </div>
                )) : (
                  <div className="text-muted-foreground">No sources available</div>
                )}
              </div>
            )}
          </Card>
        )}

        <form onSubmit={onSend} className="flex gap-2 items-center">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                onSend(e as unknown as React.FormEvent);
              }
            }}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" className="bg-primary hover:bg-primary-glow" aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
