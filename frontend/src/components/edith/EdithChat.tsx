import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, Send, X, Minus, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEdith, useHydrated } from "@/lib/store";
import { toast } from "sonner";
import api from "@/lib/api";

const SUGGESTIONS = [
  "Find 5 content writing jobs over $200",
  "Generate a proposal for job #1",
  "Create invoice for GreenLeaf for $700",
  "Show my earnings",
  "Scan trending products",
];

function generateLocalReply(message: string, ctx: { jobs: any[]; invoices: any[]; activeJobs: any[]; agents: any[]; profile: any }): string {
  const m = message.toLowerCase();
  if (/find|jobs?|opportunit/.test(m)) {
    const top = ctx.jobs.slice(0, 5);
    return `Here are top matches:\n\n${top.map((j, i) => `${i + 1}. **${j.title}** — ${j.budget} · score ${j.score}/100`).join("\n")}\n\nSay "generate proposal for job #N" to draft one.`;
  }
  if (/generate|draft.*proposal|proposal.*for/.test(m)) {
    const num = parseInt(m.match(/#?(\d+)/)?.[1] || "1", 10);
    const job = ctx.jobs[num - 1] || ctx.jobs[0];
    return `Drafting a proposal for **${job?.title ?? "the job"}**. Head to **Freelance Studio** → click "Generate Proposal" on the job card.`;
  }
  if (/invoice|bill/.test(m)) {
    const amt = m.match(/\$?(\d{2,5})/)?.[1] || "700";
    const client = m.match(/for\s+([A-Z][\w&\s]+?)(?:\s+for|$)/i)?.[1]?.trim() || "your client";
    return `Invoice draft ready for **${client}** at **$${amt}**. Open **Invoices** → "Generate New Invoice".`;
  }
  if (/earning|revenue|made/.test(m)) {
    const total = ctx.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
    const pending = ctx.invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
    return `**Your earnings:**\n\n- Paid: **$${total.toLocaleString()}**\n- Pending: **$${pending.toLocaleString()}**\n- Active: **${ctx.activeJobs.length}** projects`;
  }
  if (/scan.*product|trending/.test(m)) return `Starting product scan across AliExpress and TikTok… Results will appear in **Dropshipping Lab**.`;
  if (/pause.*agent|stop.*agent/.test(m)) return `Pausing all freelance agents. ✅ Resume from **AI Agents**.`;
  if (/roas|ad performance|ads/.test(m)) return `Current ads:\n\n- ZenPod: **3.2x ROAS** ✅\n- AuraLamp: **2.95x ROAS** ✅\n- GlowBrush: **1.21x ROAS** ⚠️\n- AeroChef: **0.8x ROAS** 🚨`;
  if (/help|what can/.test(m)) return `I can help with:\n\n- 🔍 Find jobs\n- 📝 Draft proposals\n- 💰 Create invoices\n- 📊 Show earnings\n- ⚡ Manage agents\n- 📦 Scan products`;
  return `I'm not sure about "${message}". Try: "find jobs", "show earnings", "scan products", or "help".`;
}

export function EdithChat() {
  const route = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messages = useHydrated((s) => s.chat, [] as any[]);
  const profile = useHydrated((s) => s.profile, { name: "Alex" } as any);
  const addMsg = useEdith((s) => s.addChatMsg);
  const clearChat = useEdith((s) => s.clearChat);
  const logActivity = useEdith((s) => s.logActivity);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); setMinimized(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const clear = useCallback(() => { clearChat(); setSessionId(undefined); toast.success("Chat cleared"); }, [clearChat]);

  const send = useCallback(async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    addMsg({ id: crypto.randomUUID(), role: "user", content: message, createdAt: new Date().toISOString() });
    setBusy(true);
    try {
      const result = await api.chat.sendMessage({ message, session_id: sessionId, contextPage: route }) as any;
      const data = result?.data;
      if (data) {
        if (data.sessionId) setSessionId(data.sessionId);
        addMsg({ id: crypto.randomUUID(), role: "assistant", content: data.text || "Done.", createdAt: new Date().toISOString() });
        const ct = data.commandType;
        if (ct === "job_scan") { logActivity("AI triggered job scan", "freelance"); setTimeout(() => navigate({ to: "/freelance" }), 1000); }
        else if (ct === "product_scan") { logActivity("AI triggered product scan", "drop"); setTimeout(() => navigate({ to: "/dropshipping" }), 1000); }
        else if (ct === "create_invoice" || ct === "send_invoice") setTimeout(() => navigate({ to: "/invoices" }), 800);
        else if (ct === "generate_proposal") setTimeout(() => navigate({ to: "/freelance" }), 800);
        else if (ct === "view_analytics") setTimeout(() => navigate({ to: "/analytics" }), 500);
        else if (ct === "system_status") setTimeout(() => navigate({ to: "/agents" }), 500);
      }
    } catch {
      const store = useEdith.getState();
      const reply = generateLocalReply(message, { jobs: store.jobs, invoices: store.invoices, activeJobs: store.activeJobs, agents: store.agents, profile: store.profile });
      addMsg({ id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: new Date().toISOString() });
      if (/invoice/.test(message.toLowerCase())) setTimeout(() => navigate({ to: "/invoices" }), 800);
      else if (/proposal|job/.test(message.toLowerCase())) setTimeout(() => navigate({ to: "/freelance" }), 800);
      else if (/product|dropship/.test(message.toLowerCase())) setTimeout(() => navigate({ to: "/dropshipping" }), 800);
    } finally {
      setBusy(false);
    }
  }, [input, busy, sessionId, route, addMsg, logActivity, navigate]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110" title="Chat with EDITH (⌘K)">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-60" />
        <Bot className="h-6 w-6 text-primary-foreground" />
      </button>
    );
  }
  if (minimized) {
    return (
      <button onClick={() => setMinimized(false)} className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
        <Bot className="h-4 w-4" /> EDITH
      </button>
    );
  }
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border/60 bg-background/95 shadow-elevated backdrop-blur-xl md:w-[420px] animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-3 border-b border-border/60 bg-card/40 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow"><Bot className="h-5 w-5 text-primary-foreground" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">EDITH AI Assistant</p>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online · {route}</p>
        </div>
        <button onClick={clear} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-destructive" title="Clear"><Trash2 className="h-4 w-4" /></button>
        <button onClick={() => setMinimized(true)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"><Minus className="h-4 w-4" /></button>
        <button onClick={() => setOpen(false)} className="rounded p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Bot className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p>Hey {profile.name?.split(" ")[0] || "there"}! I'm your AI command center.</p>
            <p className="mt-1 text-xs">Ask me anything or try a suggestion below.</p>
          </div>
        ) : messages.map((m: any) => <Bubble key={m.id} msg={m} />)}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            <span className="flex gap-1">
              {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />)}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {SUGGESTIONS.map((s) => (<button key={s} onClick={() => send(s)} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/15">{s}</button>))}
        </div>
      </div>
      <div className="border-t border-border/60 bg-card/40 p-3">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a command…" rows={1} disabled={busy}
            className="max-h-32 flex-1 resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50" />
          <button onClick={() => send()} disabled={!input.trim() || busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line · ⌘K to toggle</p>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${isUser ? "bg-primary text-primary-foreground" : "bg-gradient-primary shadow-glow"}`}>
        {isUser ? "A" : <Bot className="h-4 w-4 text-primary-foreground" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm ${isUser ? "rounded-tr-sm border-primary/40 bg-primary/15 text-foreground" : "rounded-tl-sm border-border/60 bg-card/60"}`}>
        <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
