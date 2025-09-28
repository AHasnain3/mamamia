'use client';

import { useEffect, useState } from "react";

type DiaryEntry = {
  id: number;
  riskSignal: "GREEN" | "YELLOW" | "RED" | null;
  redactedNotes: string | null;
};

export default function DiarySummaryPage() {
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorComment, setDoctorComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch latest diary summary from the API
  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const res = await fetch(`/api/diary?date=${today}`);
        const data = await res.json();
        setEntry(data.entry ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          freeText: entry.redactedNotes ?? "",
          responses: { doctorComment },
        }),
      });
      const data = await res.json();
      setEntry((prev) => prev ? { ...prev, ...data.entry } : prev);
      setDoctorComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-neutral-200">Loading diary summary...</div>;
  if (!entry) return <div className="p-6 text-neutral-200">No diary entry found for today.</div>;

  const riskColor = entry.riskSignal === "RED"
    ? "text-red-400"
    : entry.riskSignal === "YELLOW"
    ? "text-yellow-400"
    : "text-green-400";

  return (
    <main className="relative h-dvh isolate p-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* background layers */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 pointer-events-none
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      <h1 className="text-2xl md:text-3xl font-bold text-neutral-50">Diary Summary</h1>

      <div className={`p-4 border rounded bg-neutral-800/20 ${riskColor}`}>
        <h2 className="font-semibold mb-2 text-neutral-50">Privacy-Preserving Summary</h2>
        <p className="text-neutral-200">{entry.redactedNotes ?? "No summary available."}</p>
        {entry.riskSignal && (
          <p className="mt-2 font-medium text-neutral-50">Risk Signal: {entry.riskSignal}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="doctorComment" className="font-medium text-neutral-50">
          Doctor's Comment
        </label>
        <textarea
          id="doctorComment"
          value={doctorComment}
          onChange={(e) => setDoctorComment(e.target.value)}
          rows={4}
          className="w-full p-3 border rounded bg-neutral-800/20 text-neutral-50
                     focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
        />
        <button
          onClick={handleSave}
          disabled={saving || !doctorComment.trim()}
          className="self-end bg-purple-600 hover:bg-purple-700 text-neutral-50 px-4 py-2 rounded font-semibold shadow transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Comment"}
        </button>
      </div>
    </main>
  );
}
