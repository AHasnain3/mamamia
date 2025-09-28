'use client';

import { useEffect, useState } from "react";

type ProviderDraftItem = {
  id: number;
  draftText: string;
};

type CedarResponse = {
  suggestedText?: string; // optional
};

export default function ProviderDraftsPage() {
  const [drafts, setDrafts] = useState<ProviderDraftItem[]>([]);
  const [editingDrafts, setEditingDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [hilLoading, setHilLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function fetchDrafts() {
      try {
        const res = await fetch("/api/provider/drafts");
        const data = await res.json();
        setDrafts(data.drafts);

        const editState: Record<number, string> = {};
        data.drafts.forEach((d: ProviderDraftItem) => (editState[d.id] = d.draftText));
        setEditingDrafts(editState);
      } catch (err) {
        console.error("Failed to fetch drafts", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrafts();
  }, []);

  const handleChange = (id: number, value: string) => {
    setEditingDrafts(prev => ({ ...prev, [id]: value }));
  };

  const handleCedarSuggest = async (id: number) => {
    setHilLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/provider/drafts/hil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id, draftText: editingDrafts[id] }),
      });
      const data: CedarResponse = await res.json();
      setEditingDrafts(prev => ({ ...prev, [id]: data.suggestedText ?? prev[id] }));
    } catch (err) {
      console.error("Cedar HIL suggestion failed", err);
    } finally {
      setHilLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleApprove = async (id: number) => {
    const updatedText = editingDrafts[id];
    try {
      await fetch("/api/provider/drafts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id, finalText: updatedText }),
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
      setEditingDrafts(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error("Failed to approve draft", err);
    }
  };

  if (loading)
    return <div className="p-6 text-center text-neutral-200">Loading drafts...</div>;
  if (!drafts.length)
    return <div className="p-6 text-center text-neutral-400">No drafts available.</div>;

  return (
    <main className="relative p-6 max-w-5xl mx-auto space-y-6">
      {/* Background layers */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 pointer-events-none
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 mb-6">
        Provider Draft Queue (Cedar HIL)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drafts.map(draft => (
          <div
            key={draft.id}
            className="flex flex-col space-y-3 border rounded-lg p-4 bg-neutral-800/20 shadow"
          >
            <textarea
              rows={5}
              value={editingDrafts[draft.id] ?? ""}
              onChange={(e) => handleChange(draft.id, e.target.value)}
              className="w-full p-3 text-neutral-50 border rounded bg-neutral-700/30
                         focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleCedarSuggest(draft.id)}
                disabled={hilLoading[draft.id]}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-neutral-50 rounded font-medium shadow transition disabled:opacity-50"
              >
                {hilLoading[draft.id] ? "Suggesting..." : "Cedar Suggest"}
              </button>
              <button
                onClick={() => handleApprove(draft.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-neutral-50 rounded font-medium shadow transition"
              >
                Approve & Send
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
