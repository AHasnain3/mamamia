"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  HeartPulse,
  Stethoscope,
  Send,
  Plus,
  History as HistoryIcon,
  UserSquare2
} from "lucide-react";

type ChatMode = "GENERAL" | "MOOD" | "BONDING" | "HEALTH";

type Session = {
  id: number;
  motherId: number;
  date: string;      // ISO
  seqInDay: number;
  mode: ChatMode;
  createdAt: string; // ISO
};

type Msg = {
  id: number;
  sessionId: number;
  role: "MOTHER" | "MIA" | "PROVIDER";
  content: string;
  oversight: "NONE" | "AWAITING_PROVIDER" | "APPROVED" | "MODIFIED";
  relayTicketId?: number | null;
  meta?: any;
  createdAt: string; // ISO
};

export default function MotherPage() {
  const router = useRouter();
  const params = useSearchParams();

  // UI state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<ChatMode>("GENERAL");
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Load session/messages (initial + when params change)
  async function load(opts?: { sessionId?: number; dateYMD?: string; forceMode?: ChatMode }) {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("date", opts?.dateYMD || date);
      if (opts?.sessionId) qs.set("sessionId", String(opts.sessionId));
      if (opts?.forceMode) qs.set("mode", opts.forceMode);

      const res = await fetch(`/api/mia?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setSession(json.session);
      setMessages(json.messages || []);
      if (json.session?.mode) setMode(json.session.mode);
    } finally {
      setLoading(false);
    }
  }

  // Deep-link support (?date=&sessionId=)
  useEffect(() => {
    const sid = params.get("sessionId");
    const dt = params.get("date");
    if (dt) setDate(dt);
    if (sid) {
      load({ sessionId: Number(sid), dateYMD: dt || date });
    } else {
      load({ dateYMD: dt || date });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Send a message
  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      const body: any = {
        date,
        mode,
        text,
      };
      if (session?.id) body.sessionId = session.id;

      const res = await fetch("/api/mia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setSession(json.session);
      setMessages(json.messages || []);
      setInput("");
      // Keep focus on input
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setSending(false);
    }
  }

  // New chat (same day -> seqInDay++)
  async function startNewChat() {
    setSending(true);
    try {
      const res = await fetch("/api/mia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mode, text: "(started new chat)", newChat: true }),
      });
      const json = await res.json();
      setSession(json.session);
      setMessages(json.messages || []);
      setInput("");
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  // Keyboard: Enter to send, Shift+Enter newline
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) sendMessage();
    }
  }

  const modeChips = useMemo(
    () => [
      { key: "MOOD" as const, label: "Mood & Well-Being", icon: <HeartPulse className="h-4 w-4" /> , bg: "bg-indigo-600", hover: "hover:bg-indigo-500" },
      { key: "BONDING" as const, label: "Bonding", icon: <span className="text-base">🤱</span>, bg: "bg-emerald-600", hover: "hover:bg-emerald-500" },
      { key: "HEALTH" as const, label: "Medical", icon: <Stethoscope className="h-4 w-4" />, bg: "bg-rose-600", hover: "hover:bg-rose-500" },
    ],
    []
  );

  return (
    <div className="h-dvh grid grid-rows-[auto_1fr_auto] bg-neutral-950 text-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/90">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm sm:text-base font-semibold">Mia</div>
            <div className="ml-2 hidden sm:block text-xs text-neutral-400">
              {mode === "GENERAL" ? "General support" : mode === "MOOD" ? "Mood & Well-Being" : mode === "BONDING" ? "Bonding" : "Medical"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/mother/history"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
              title="History"
            >
              <HistoryIcon className="h-4 w-4" />
              History
            </Link>
            <button
              onClick={startNewChat}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              title="Start new chat"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
            <Link
              href="/provider"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              title="Message your provider"
            >
              <UserSquare2 className="h-4 w-4" />
              Provider
            </Link>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto max-w-5xl w-full overflow-y-auto px-3 sm:px-4 py-4">
        {/* Mode chips row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {modeChips.map((m) => {
            const active = mode === m.key;
            const className = [
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              active ? `${m.bg} text-white` : "bg-white/8 text-neutral-200 hover:bg-white/12",
              active ? "shadow-[0_8px_30px_rgba(0,0,0,0.35)]" : "",
            ].join(" ");
            return (
              <button key={m.key} onClick={() => setMode(m.key)} className={className}>
                {m.icon}<span>{m.label}</span>
              </button>
            );
          })}
          {mode !== "GENERAL" && (
            <button
              onClick={() => setMode("GENERAL")}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-neutral-200 bg-white/8 hover:bg-white/12"
              title="Back to General"
            >
              Reset to General
            </button>
          )}
        </div>

        {/* Conversation */}
        <div className="space-y-3">
          {loading && messages.length === 0 && (
            <div className="text-sm text-neutral-400">Loading conversation…</div>
          )}

          {messages.map((m) => {
            const isMe = m.role === "MOTHER";
            const isAwaiting = m.oversight === "AWAITING_PROVIDER";
            const bubble =
              isMe
                ? "bg-gradient-to-tr from-purple-500/90 to-fuchsia-500/90"
                : "bg-white/8";
            const border =
              isMe ? "border-white/10" : "border-white/10";
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[75%] rounded-2xl border ${border} ${bubble} px-4 py-3`}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-white/80">
                      {m.role === "MOTHER" ? "You" : m.role === "PROVIDER" ? "Provider" : "Mia"}
                    </span>
                    {isAwaiting && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-[2px] text-[11px] text-amber-300 border border-amber-500/30">
                        awaiting provider approval
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-[15px] leading-7 text-neutral-50">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-3">
          <div className="rounded-full border border-white/15 bg-white/5 p-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={
                  mode === "GENERAL"
                    ? "Start typing to chat with Mia…"
                    : mode === "MOOD"
                    ? "Share how you’re feeling today…"
                    : mode === "BONDING"
                    ? "Ask about bonding or baby cues…"
                    : "Ask a medical question (may be routed to your provider)…"
                }
                className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-neutral-50 placeholder:text-neutral-400 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={sending || input.trim().length === 0}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition
                  ${sending || input.trim().length === 0
                    ? "cursor-not-allowed bg-white/10 text-neutral-400"
                    : "bg-purple-500 hover:bg-purple-400 text-white"
                  }`}
                title="Send"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>

          {/* Hint row */}
          <div className="mt-2 flex items-center justify-between text-[12px] text-neutral-400">
            <div>
              Press <kbd className="rounded bg-white/10 px-1.5 py-[2px]">Enter</kbd> to send • <kbd className="rounded bg-white/10 px-1.5 py-[2px]">Shift</kbd>+<kbd className="rounded bg-white/10 px-1.5 py-[2px]">Enter</kbd> for a new line
            </div>
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline">Go to</span>
              <Link href="/mother/history" className="inline-flex items-center gap-1 text-neutral-300 hover:text-white">
                <HistoryIcon className="h-3.5 w-3.5" />
                History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
