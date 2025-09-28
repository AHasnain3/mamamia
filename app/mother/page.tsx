"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  HeartPulse,
  Stethoscope,
  Send,
  Plus,
  History as HistoryIcon,
  Home as HomeIcon, // ← add this
  UserSquare2,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

type ChatMode = "GENERAL" | "MOOD" | "BONDING" | "HEALTH";
type SurveyMode = "MOOD" | "BONDING";
const isSurveyMode = (m: ChatMode): m is SurveyMode => m === "MOOD" || m === "BONDING";

type Session = {
  id: number;
  motherId: number;
  date: string;
  seqInDay: number;
  mode: ChatMode;
  createdAt: string;
};

type Msg = {
  id: number;
  sessionId: number;
  role: "MOTHER" | "MIA" | "PROVIDER";
  content: string;
  oversight: "NONE" | "AWAITING_PROVIDER" | "APPROVED" | "MODIFIED";
  relayTicketId?: number | null;
  meta?: any;
  createdAt: string;
};

export default function MotherPage() {
  const params = useSearchParams();

  // UI state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<ChatMode>("GENERAL");
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // First-run flow controls
  const [modePinnedTop, setModePinnedTop] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // prevents auto-creating a session

  // Survey state
  const [surveyOpen, setSurveyOpen] = useState<false | SurveyMode>(false);
  // MOOD form
  const [exercise, setExercise] = useState<"NONE"|"LIGHT"|"MODERATE"|"VIGOROUS">("LIGHT");
  const [eating, setEating] = useState<"POOR"|"FAIR"|"GOOD"|"EXCELLENT">("GOOD");
  const [sleep, setSleep] = useState<"POOR"|"FAIR"|"GOOD"|"EXCELLENT">("FAIR");
  const [mentalScore, setMentalScore] = useState<number>(6);
  // BONDING form
  const [babyContentScore, setBabyContentScore] = useState<number>(7);
  const [timeWithBabyMin, setTimeWithBabyMin] = useState<number>(60);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus composer on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Build a compact conversation context to send to backend
  function buildAdditionalContext() {
    const recent = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1000),
      oversight: m.oversight,
    }));
    return {
      chat: {
        date,
        mode,
        sessionId: session?.id ?? null,
        recent,
      },
    };
  }

  // --- helpers to craft an intro cue for Mia (used when Mia starts first)
  function introCueForMode(nextMode: ChatMode, extras?: any) {
    if (nextMode === "MOOD") {
      return {
        greet: true,
        tone: "warm, validating, reassuring",
        instruction:
          "Open with 2–3 gentle sentences that validate feelings and encourage brief self-reflection. Ask ONE short question to help her notice how she’s doing (e.g., mood, sleep, energy).",
        survey: extras?.survey ?? null,
      };
    }
    if (nextMode === "BONDING") {
      return {
        greet: true,
        tone: "encouraging, supportive",
        instruction:
          "Open with 1–2 friendly sentences, then suggest ONE practical bonding activity she could try today, and ask ONE short follow-up question about their time together.",
        survey: extras?.survey ?? null,
      };
    }
    if (nextMode === "HEALTH") {
      return {
        greet: true,
        tone: "concerned, helpful",
        instruction:
          "Open with a brief, caring greeting and ask what you can help with today. Keep it 1–2 sentences.",
      };
    }
    return {
      greet: true,
      tone: "friendly",
      instruction: "Start with a short, kind greeting and ask how you can support her right now.",
    };
  }

  // Load session/messages (only when explicitly requested)
  async function load(opts?: {
    sessionId?: number;
    dateYMD?: string;
    forceMode?: ChatMode;
  }) {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("date", opts?.dateYMD || date);
      if (opts?.sessionId) qs.set("sessionId", String(opts.sessionId));
      if (opts?.forceMode) qs.set("mode", String(opts?.forceMode));

      const res = await fetch(`/api/mia?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setSession(json.session);
      setMessages(json.messages || []);
      if (json.session?.mode) setMode(json.session.mode);

      if (opts?.forceMode || json.session?.mode) setModePinnedTop(true);
    } finally {
      setLoading(false);
    }
  }

  // Deep-link support (?date=&sessionId=&mode=)
  useEffect(() => {
    const sid = params.get("sessionId");
    const dt = params.get("date");
    const qMode = params.get("mode") as ChatMode | null;
    if (dt) setDate(dt);

    const shouldAutoLoad = Boolean(sid || qMode);
    if (shouldAutoLoad) {
      (async () => {
        if (sid) {
          await load({
            sessionId: Number(sid),
            dateYMD: dt || date,
            forceMode: qMode || undefined,
          });
        } else {
          await load({ dateYMD: dt || date, forceMode: qMode || undefined });
        }
        setHasLoaded(true);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // --- create a brand-new empty session and return it
  async function startFreshSession(nextMode: ChatMode): Promise<Session> {
    const res = await fetch("/api/mia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        mode: nextMode,
        newChat: true,
        createOnly: true,
      }),
    });
    const json = await res.json();
    const sess: Session = json.session;
    setSession(sess);
    setMessages(json.messages || []);
    setHasLoaded(true);
    setModePinnedTop(true);
    return sess;
  }

  // --- stream an intro message from Mia (she speaks first)
  async function streamMiaIntro(targetSessionId: number, nextMode: ChatMode, extras?: any) {
    // optimistic Mia bubble
    const tempMia: Msg = {
      id: Math.floor(Math.random() * -1e6),
      sessionId: targetSessionId,
      role: "MIA",
      content: "",
      oversight: "NONE",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMia]);

    const bumpScroll = () =>
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });

    // build an intro-focused additional context
    const additionalContext = {
      ...buildAdditionalContext(),
      intro: introCueForMode(nextMode, extras),
    };

    const res = await fetch("/api/mia/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        mode: nextMode,
        text: "",                 // <— no mother message, Mia will greet first
        sessionId: targetSessionId,
        additionalContext,
      }),
    });

    if (!res.body) {
      // fallback (non-stream) — shouldn’t usually happen
      const r = await fetch("/api/mia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mode: nextMode,
          text: "", // backend will 400; but stream route should exist. We keep this for safety.
          sessionId: targetSessionId,
          additionalContext,
        }),
      });
      const json = await r.json();
      setSession(json.session);
      setMessages(json.messages || []);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";

    const updateTemp = (content: string | ((prev: string) => string)) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMia.id
            ? { ...m, content: typeof content === "function" ? content(m.content) : content }
            : m
        )
      );
      bumpScroll();
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      const lines = acc.split("\n");
      acc = lines.pop() || "";

      for (const raw of lines) {
        const s = raw.trim();
        if (!s) continue;
        let evt: any;
        try {
          evt = JSON.parse(s);
        } catch {
          continue;
        }

        if (evt.type === "session" && evt.session) {
          setSession(evt.session);
        } else if (evt.type === "delta") {
          updateTemp((prev) => prev + evt.text);
        } else if (evt.type === "awaiting_provider") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempMia.id
                ? {
                    ...m,
                    content: "Message awaiting provider approval.",
                    oversight: "AWAITING_PROVIDER",
                    relayTicketId: evt.ticketId,
                  }
                : m
            )
          );
        } else if (evt.type === "final") {
          // refresh canonical history
          const qs = new URLSearchParams();
          const sid = evt.sessionId || targetSessionId;
          if (sid) qs.set("sessionId", String(sid));
          const r = await fetch(`/api/mia?${qs.toString()}`, { cache: "no-store" });
          const json = await r.json();
          setSession(json.session);
          setMessages(json.messages || []);
        } else if (evt.type === "error") {
          updateTemp(`⚠️ ${evt.message}`);
        }
      }
    }
  }

  // Send a message (user-initiated) with streaming
  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setSending(true);

    // optimistic bubbles
    const tempUser: Msg = {
      id: Math.floor(Math.random() * -1e6),
      sessionId: session?.id || -1,
      role: "MOTHER",
      content: text,
      oversight: "NONE",
      createdAt: new Date().toISOString(),
    };
    const tempMia: Msg = {
      id: Math.floor(Math.random() * -1e6),
      sessionId: session?.id || -1,
      role: "MIA",
      content: "",
      oversight: "NONE",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser, tempMia]);
    setInput("");

    const bumpScroll = () =>
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });

    try {
      const res = await fetch("/api/mia/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mode,
          text,
          sessionId: session?.id,
          newChat: !session?.id,
          additionalContext: buildAdditionalContext(),
        }),
      });

      if (!res.body) {
        const r = await fetch("/api/mia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mode,
            text,
            sessionId: session?.id,
            newChat: !session?.id,
            additionalContext: buildAdditionalContext(),
          }),
        });
        const json = await r.json();
        setSession(json.session);
        setMessages(json.messages || []);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      const updateTemp = (content: string | ((prev: string) => string)) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMia.id
              ? { ...m, content: typeof content === "function" ? content(m.content) : content }
              : m
          )
        );
        bumpScroll();
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const lines = acc.split("\n");
        acc = lines.pop() || "";

        for (const raw of lines) {
          const s = raw.trim();
          if (!s) continue;
          let evt: any;
          try {
            evt = JSON.parse(s);
          } catch {
            continue;
          }

          if (evt.type === "session" && evt.session) {
            setSession(evt.session);
          } else if (evt.type === "delta") {
            updateTemp((prev) => prev + evt.text);
          } else if (evt.type === "awaiting_provider") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempMia.id
                  ? {
                      ...m,
                      content: "Message awaiting provider approval.",
                      oversight: "AWAITING_PROVIDER",
                      relayTicketId: evt.ticketId,
                    }
                  : m
              )
            );
          } else if (evt.type === "final") {
            const qs = new URLSearchParams();
            const sid = evt.sessionId || session?.id;
            if (sid) qs.set("sessionId", String(sid));
            const r = await fetch(`/api/mia?${qs.toString()}`, { cache: "no-store" });
            const json = await r.json();
            setSession(json.session);
            setMessages(json.messages || []);
          } else if (evt.type === "error") {
            updateTemp(`⚠️ ${evt.message}`);
          }
        }
      }
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  // New chat button → create empty session (no auto-greeting)
  async function startNewChat() {
    setSending(true);
    try {
      const res = await fetch("/api/mia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mode,
          newChat: true,
          createOnly: true,
        }),
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

  // Mode selector
  function selectMode(next: ChatMode) {
    setMode(next);

    // HEALTH: skip popup, create a fresh session and have Mia greet first
    if (next === "HEALTH") {
      setSurveyOpen(false);
      (async () => {
        const sess = await startFreshSession(next);
        await streamMiaIntro(sess.id, next);
        requestAnimationFrame(() => inputRef.current?.focus());
      })();
      return;
    }

    // MOOD/BONDING: open survey modal; otherwise ensure it's closed
    if (isSurveyMode(next)) {
      setSurveyOpen(next); // "MOOD" | "BONDING"
    } else {
      setSurveyOpen(false); // handles "GENERAL"
    }
  }

  // Submit surveys → start a brand-new chat → Mia greets with tailored tone
  async function submitSurvey() {
    if (!surveyOpen) return;

    const base = {
      type: surveyOpen as SurveyMode,
      date,
      motherId: session?.motherId ?? null,
      sessionId: session?.id ?? null,
    };

    const payload =
      surveyOpen === "MOOD"
        ? { ...base, exercise, eating, sleep, mentalScore }
        : { ...base, babyContentScore, timeWithBabyMin };

    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Survey save failed");
      return;
    }

    const modeToLoad: ChatMode = isSurveyMode(surveyOpen) ? surveyOpen : "GENERAL";

    setSurveyOpen(false);
    const sess = await startFreshSession(modeToLoad);
    // pass survey answers so Mia can reference them softly
    const surveyContext =
      modeToLoad === "MOOD"
        ? { survey: { exercise, eating, sleep, mentalScore } }
        : { survey: { babyContentScore, timeWithBabyMin } };
    await streamMiaIntro(sess.id, modeToLoad, surveyContext);

    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const modeChips = useMemo(
    () => [
      {
        key: "MOOD" as const,
        label: "Mood & Well-Being",
        icon: <HeartPulse className="h-4 w-4" />,
        bg: "bg-indigo-600",
        hover: "hover:bg-indigo-500",
      },
      {
        key: "BONDING" as const,
        label: "Bonding",
        icon: <span className="text-base">🤱</span>,
        bg: "bg-emerald-600",
        hover: "hover:bg-emerald-500",
      },
      {
        key: "HEALTH" as const,
        label: "Help / Ask Questions",
        icon: <Stethoscope className="h-4 w-4" />,
        bg: "bg-rose-600",
        hover: "hover:bg-rose-500",
      },
    ],
    []
  );

  const showCenteredChooser = !modePinnedTop && messages.length === 0 && !hasLoaded;

  // Variants
  const overlayVariants: Variants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
  };
  const chipsRowVariants: Variants = {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  // --- Inline Survey Modal ---
  function SurveyModal() {
    if (!surveyOpen) return null;
    const isMood = surveyOpen === "MOOD";
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-xl"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }}
          exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as [number, number, number, number] } }}
        >
          <div className="mb-3 text-sm font-semibold text-white">
            {isMood ? "Quick check-in: Mood & Well-Being" : "Quick check-in: Bonding"}
          </div>

          {isMood ? (
            <div className="space-y-4 text-sm">
              <Field label="Recent exercise habits">
                <ChoiceRow value={exercise} onChange={setExercise} options={["NONE","LIGHT","MODERATE","VIGOROUS"]} />
              </Field>
              <Field label="Eating habits">
                <ChoiceRow value={eating} onChange={setEating} options={["POOR","FAIR","GOOD","EXCELLENT"]} />
              </Field>
              <Field label="Sleep habits">
                <ChoiceRow value={sleep} onChange={setSleep} options={["POOR","FAIR","GOOD","EXCELLENT"]} />
              </Field>
              <Field label="Current mental well-being (1–10)">
                <NumberSlider value={mentalScore} setValue={setMentalScore} min={1} max={10} />
              </Field>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <Field label="Baby’s apparent contentness (1–10)">
                <NumberSlider value={babyContentScore} setValue={setBabyContentScore} min={1} max={10} />
              </Field>
              <Field label="Time spent with baby (minutes)">
                <input
                  type="number"
                  min={0}
                  className="w-28 rounded-md border border-white/15 bg-white/5 px-2 py-1 outline-none"
                  value={timeWithBabyMin}
                  onChange={(e) => setTimeWithBabyMin(Math.max(0, Number(e.target.value)))}
                />
              </Field>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setSurveyOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={submitSurvey}
              className="rounded-full bg-purple-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-400"
            >
              Save & Continue
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Small UI helpers for the modal ---
  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <div className="mb-1 text-neutral-300">{label}</div>
        {children}
      </div>
    );
  }
  function ChoiceRow<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`rounded-full px-3 py-1.5 text-xs ${active ? "bg-white text-neutral-900" : "bg-white/10 text-neutral-200 hover:bg-white/20"}`}
            >
              {opt.charAt(0) + opt.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
    );
  }
  function NumberSlider({ value, setValue, min, max }: { value: number; setValue: (n: number) => void; min: number; max: number }) {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="w-10 text-right text-neutral-200">{value}</div>
      </div>
    );
  }

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
              {mode === "GENERAL"
                ? "General support"
                : mode === "MOOD"
                ? "Mood & Well-Being"
                : mode === "BONDING"
                ? "Bonding"
                : "Help / Ask Questions"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/mother/history"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
            >
              <HistoryIcon className="h-4 w-4" />
              History
            </Link>
            <button
              onClick={startNewChat}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto max-w-5xl w-full overflow-y-auto px-3 sm:px-4 py-4 relative">
        {/* FIRST-RUN CENTERED CHOOSER */}
        <AnimatePresence>
          {!surveyOpen && !modePinnedTop && messages.length === 0 && !hasLoaded && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center"
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="pointer-events-auto">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={() => selectMode("MOOD")}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition bg-indigo-600 text-white shadow-[0_8px_30px_rgba(79,70,229,0.45)] hover:bg-indigo-500"
                  >
                    <HeartPulse className="h-4 w-4" />
                    Mood & Well-Being
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => selectMode("BONDING")}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.45)] hover:bg-emerald-500"
                    >
                      <span className="text-base">🤱</span>
                      Bonding
                    </button>
                    <button
                      onClick={() => selectMode("HEALTH")}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition bg-rose-600 text-white shadow-[0_8px_30px_rgba(244,63,94,0.45)] hover:bg-rose-500"
                    >
                      <Stethoscope className="h-4 w-4" />
                      Help / Ask Questions
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      setMode("GENERAL");
                      const sess = await startFreshSession("GENERAL");
                      await streamMiaIntro(sess.id, "GENERAL");
                    }}
                    className="mt-1 text-xs text-neutral-300 hover:text-white"
                  >
                    or continue with General support →
                  </button>
                </div>
              </div>
              <div className="absolute inset-0 -z-10 bg-neutral-950/60 backdrop-blur-sm" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode chips row */}
        {!showCenteredChooser && (
          <motion.div
            className="mb-3 flex flex-wrap items-center gap-2"
            variants={chipsRowVariants}
            initial="initial"
            animate="animate"
          >
            {modeChips.map((m) => {
              const active = mode === m.key;
              const className = [
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                active
                  ? `${m.bg} text-white`
                  : "bg-white/8 text-neutral-200 hover:bg-white/12",
                active ? "shadow-[0_8px_30px_rgba(0,0,0,0.35)]" : "",
              ].join(" ");
              return (
                <button key={m.key} onClick={() => selectMode(m.key)} className={className}>
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
            {mode !== "GENERAL" && (
              <button
                onClick={async () => {
                  setMode("GENERAL");
                  const sess = await startFreshSession("GENERAL");
                  await streamMiaIntro(sess.id, "GENERAL");
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-neutral-200 bg-white/8 hover:bg-white/12"
              >
                Reset to General
              </button>
            )}
          </motion.div>
        )}

        {/* Conversation */}
        <div className="space-y-3">
          {loading && messages.length === 0 && hasLoaded && (
            <div className="text-sm text-neutral-400">Loading conversation…</div>
          )}
          {messages.map((m) => {
            const isMe = m.role === "MOTHER";
            const isAwaiting = m.oversight === "AWAITING_PROVIDER";
            const bubble = isMe
              ? "bg-gradient-to-tr from-purple-500/90 to-fuchsia-500/90"
              : "bg-white/8";
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[75%] rounded-2xl border border-white/10 ${bubble} px-4 py-3`}>
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

        {/* Survey modal */}
        <AnimatePresence>{surveyOpen && <SurveyModal />}</AnimatePresence>
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
                  ${
                    sending || input.trim().length === 0
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
          <div className="mt-2 flex items-center justify-between text:[12px] text-neutral-400">
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
