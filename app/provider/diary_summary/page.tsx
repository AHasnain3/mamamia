// app/diarySummary/page.tsx
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

  if (loading) return <div className="p-6 text-gray-700">Loading diary summary...</div>;
  if (!entry) return <div className="p-6 text-gray-700">No diary entry found for today.</div>;

  const riskColor = entry.riskSignal === "RED"
    ? "text-red-600"
    : entry.riskSignal === "YELLOW"
    ? "text-yellow-600"
    : "text-green-600";

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Diary Summary</h1>

      <div className={`p-4 border rounded bg-gray-50 ${riskColor}`}>
        <h2 className="font-semibold mb-2">Privacy-Preserving Summary</h2>
        <p>{entry.redactedNotes ?? "No summary available."}</p>
        {entry.riskSignal && <p className="mt-2 font-medium">Risk Signal: {entry.riskSignal}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="doctorComment" className="font-medium">Doctor's Comment</label>
        <textarea
          id="doctorComment"
          value={doctorComment}
          onChange={(e) => setDoctorComment(e.target.value)}
          rows={4}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSave}
          disabled={saving || !doctorComment.trim()}
          className="self-end bg-blue-500 text-white px-4 py-2 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Comment"}
        </button>
      </div>
    </div>
  );
}
