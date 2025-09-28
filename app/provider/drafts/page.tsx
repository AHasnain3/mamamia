// app/provider/drafts/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Home as HomeIcon, ClipboardCheck, ArrowLeft } from "lucide-react";

type ProviderDraftItem = {
  id: number;
  ticketId: number;
  draftText: string;
  approved?: boolean;
  createdAt?: string;
  motherId?: number | null;     // ← optional; rendered if present
  motherName?: string | null;   // ← optional; preferred over motherId
};

async function safeFetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = typeof body === "string" ? body : (body as any)?.error || "Request failed";
    throw new Error(`${res.status} ${res.statusText} – ${msg}`);
  }
  return body;
}

/** LCS word diff (unchanged) */
function diffWords(before: string, after: string) {
  const A = (before || "").split(/\s+/);
  const B = (after || "").split(/\s+/);
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ops: Array<{ type: "equal" | "del" | "ins"; text: string }> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ type: "equal", text: A[i++] }); j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", text: A[i++] }); }
    else { ops.push({ type: "ins", text: B[j++] }); }
  }
  while (i < n) ops.push({ type: "del", text: A[i++] });
  while (j < m) ops.push({ type: "ins", text: B[j++] });
  return ops;
}

function DiffView({ before, after }: { before: string; after: string }) {
  const ops = useMemo(() => diffWords(before, after), [before, after]);
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed">
      {ops.map((op, idx) => {
        const space = idx === ops.length - 1 ? "" : " ";
        if (op.type === "equal") return <span key={idx} className="text-neutral-600">{op.text}{space}</span>;
        if (op.type === "ins")   return <span key={idx} className="text-emerald-700 underline decoration-2 underline-offset-2">{op.text}{space}</span>;
        return <span key={idx} className="text-red-600 line-through decoration-2">{op.text}{space}</span>;
      })}
    </div>
  );
}

export default function ProviderDraftsPage() {
  const params = useSearchParams();
  const selectedId = params.get("motherId");
  const qs = selectedId ? `?motherId=${selectedId}` : "";
  const hasSelection = !!selectedId;

  const [drafts, setDrafts] = useState<ProviderDraftItem[]>([]);
  const [editingDrafts, setEditingDrafts] = useState<Record<number, string>>({});
  const [showDiff, setShowDiff] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const sortKey = (d: ProviderDraftItem) =>
    d.createdAt ? new Date(d.createdAt).getTime() : d.id;

  const fetchDrafts = async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const data = await safeFetchJSON("/api/provider/drafts");
      const list: ProviderDraftItem[] = Array.isArray((data as any)?.drafts) ? (data as any).drafts : [];
      // newest first
      list.sort((a, b) => sortKey(b) - sortKey(a));
      setDrafts(list);

      const edits: Record<number, string> = {};
      const toggles: Record<number, boolean> = {};
      for (const d of list) { edits[d.id] = d.draftText ?? ""; toggles[d.id] = false; }
      setEditingDrafts(edits);
      setShowDiff(toggles);
    } catch (err: any) {
      console.error("Failed to fetch drafts", err);
      setErrMsg(err?.message ?? "Failed to fetch drafts");
      setDrafts([]);
      setEditingDrafts({});
      setShowDiff({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleEditInline = (id: number, text: string) => {
    setEditingDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleApprove = async (id: number) => {
    setErrMsg(null);
    try {
      const finalText = editingDrafts[id] ?? drafts.find((d) => d.id === id)?.draftText ?? "";
      await safeFetchJSON("/api/provider/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id, finalText }),
      });
      await fetchDrafts();
    } catch (err: any) {
      console.error("Approve failed", err);
      setErrMsg(err?.message ?? "Failed to approve draft");
    }
  };

  const Header = (
    <header className="border-b sticky top-0 z-10">
      <div className="backdrop-blur-[1px] py-3 md:py-4 transition-colors bg-[rgba(147,51,234,0.26)] hover:bg-[rgba(147,51,234,0.40)]">
        <div className="mx-auto max-w-screen-2xl px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/provider${qs}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Provider Console
            </Link>
            <h2 className="text-base md:text-lg font-semibold text-neutral-50 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Draft Queue
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {hasSelection && (
              <Link
                href={`/provider/chat${qs}`}
                aria-label="Open Chat with Mother"
                className="inline-flex items-center gap-2 rounded-lg border border-pink-500/20 bg-pink-500 px-3 py-1.5 text-xs md:text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-600"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Chat with Mother</span>
              </Link>
            )}
            <Link
              href="/"
              aria-label="Return Home"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300/70 bg-white px-3 py-1.5 text-xs md:text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-100"
            >
              <HomeIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>
      </div>
      {/* Subheader removed per request */}
    </header>
  );

  const Canvas = (
    <>
      <div className="absolute inset-0 -z-20 bg-sky-200" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_560px_at_50%_-12%,rgba(191,219,254,0.75),rgba(255,255,255,0.75)_35%,transparent_70%)]" />
    </>
  );

  if (loading) {
    return (
      <div className="relative min-h-dvh">
        {Canvas}
        {Header}
        <div className="mx-auto max-w-screen-2xl px-4 py-8 text-center text-neutral-700">Loading drafts…</div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="relative min-h-dvh">
        {Canvas}
        {Header}
        <main className="mx-auto max-w-screen-2xl px-4 py-8 space-y-4">
          <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{errMsg}</div>
          <button onClick={fetchDrafts} className="rounded bg-neutral-800 px-3 py-2 text-white hover:bg-neutral-700">
            Retry
          </button>
        </main>
      </div>
    );
  }

  // newest-first rendering
  const ordered = [...drafts].sort((a, b) => sortKey(b) - sortKey(a));

  return (
    <div className="relative min-h-dvh">
      {Canvas}
      {Header}

      <main className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="max-h-[calc(100dvh-120px)] overflow-y-auto pr-1">
          {ordered.length === 0 ? (
            <div className="rounded-xl border bg-white/80 backdrop-blur p-6 text-center text-neutral-600">
              No drafts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {ordered.map((d) => {
                const approved = (d as any).approved ?? false;
                const edited = editingDrafts[d.id] ?? "";
                const original = d.draftText ?? "";
                const hasChanges = edited !== original;

                const motherLabel =
                  (d.motherName && d.motherName.trim()) ||
                  (typeof d.motherId === "number" ? `Mother #${d.motherId}` : "Unknown mother");

                return (
                  <div key={d.id} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur shadow-sm">
                    {/* card header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                      <div className="text-sm text-neutral-700">
                        <div className="font-medium text-neutral-900">
                          Draft #{d.id}
                          {d.createdAt && (
                            <span className="ml-2 text-[11px] font-normal text-neutral-500">
                              {new Date(d.createdAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-2">
                          <span className="rounded-full bg-sky-100 text-sky-800 ring-1 ring-sky-200 px-2 py-0.5 text-[11px]">
                            {motherLabel}
                          </span>
                          {hasChanges && !approved && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                              Edited
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {approved ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                            Approved
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                            Pending
                          </span>
                        )}
                        {!approved && hasChanges && (
                          <label className="ml-2 inline-flex items-center gap-2 text-xs text-neutral-700">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-blue-600"
                              checked={showDiff[d.id] || false}
                              onChange={(e) => setShowDiff((prev) => ({ ...prev, [d.id]: e.target.checked }))}
                            />
                            Diff view
                          </label>
                        )}
                      </div>
                    </div>

                    {/* editor */}
                    <div className="px-4 pb-4">
                      <textarea
                        className="mt-3 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-300 text-black placeholder:text-neutral-500"
                        rows={8}
                        value={editingDrafts[d.id] ?? original}
                        onChange={(e) => handleEditInline(d.id, e.target.value)}
                        disabled={approved}
                      />

                      {!approved && hasChanges && showDiff[d.id] && (
                        <DiffView before={original} after={edited} />
                      )}

                      {!approved && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleApprove(d.id)}
                            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          {hasChanges && (
                            <span className="text-xs text-neutral-500">
                              You’ve edited the AI draft. Approving will save your changes.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
