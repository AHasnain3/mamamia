"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  id: number;
  date: string;   // ISO
  seqInDay: number;
  mode: "GENERAL" | "MOOD" | "BONDING" | "HEALTH";
  _count: { messages: number };
  messages: { id: number; content: string; oversight: string; createdAt: string }[];
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/mia/sessions");
      const json = await res.json();
      setSessions(json.sessions || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const byDay: Record<string, Session[]> = {};
    for (const s of sessions) {
      const ymd = (s.date || "").slice(0, 10);
      byDay[ymd] = byDay[ymd] || [];
      byDay[ymd].push(s);
    }
    return Object.entries(byDay).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sessions]);

  const openSession = (s: Session) => {
    const ymd = (s.date || "").slice(0, 10);
    router.push(`/mother?date=${ymd}&sessionId=${s.id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-50 via-rose-50 to-violet-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Conversation History</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Browse past chats by day. Click to reopen a session.
        </p>

        {loading && (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
            Loading…
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-neutral-600 shadow-sm">
            No conversations yet.
          </div>
        )}

        <div className="space-y-8">
          {grouped.map(([ymd, list]) => (
            <section key={ymd}>
              <h2 className="mb-3 text-sm font-medium text-neutral-700">{ymd}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {list.map((s) => {
                  const last = s.messages?.[0];
                  const preview =
                    (last?.content || "").length > 140
                      ? last!.content.slice(0, 140) + "…"
                      : last?.content || "No messages";
                  const badge =
                    s.mode === "HEALTH"
                      ? "bg-red-500 text-white"
                      : s.mode === "MOOD"
                      ? "bg-indigo-600 text-white"
                      : s.mode === "BONDING"
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-800 text-white";

                  return (
                    <button
                      key={s.id}
                      onClick={() => openSession(s)}
                      className="group rounded-2xl border border-black/10 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge}`}>
                          {s.mode}
                        </span>
                        <span className="rounded-full bg-black/5 px-3 py-1 text-xs">
                          Chat #{s.seqInDay}
                        </span>
                        <span className="ml-auto text-xs text-neutral-500">{s._count.messages} msg</span>
                      </div>
                      <div className="line-clamp-3 text-[15px] leading-7 text-neutral-800">
                        {preview}
                      </div>
                      {last?.oversight === "AWAITING_PROVIDER" && (
                        <div className="mt-2 text-xs text-amber-600">Awaiting provider approval</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
