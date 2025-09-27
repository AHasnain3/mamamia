'use client';

import { useEffect, useState } from "react";

type ProviderDraftItem = {
  id: number;
  draftText: string;
};

type CedarResponse = {
  suggestedText: string;
};

export default function ProviderDraftsPage() {
  const [drafts, setDrafts] = useState<ProviderDraftItem[]>([]);
  const [editingDrafts, setEditingDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [hilLoading, setHilLoading] = useState<Record<number, boolean>>({});

  // Fetch drafts for first mother
  useEffect(() => {
    async function fetchDrafts() {
      const res = await fetch("/api/provider/drafts");
      const data = await res.json();
      setDrafts(data.drafts);
      const editState: Record<number, string> = {};
      data.drafts.forEach((d: ProviderDraftItem) => (editState[d.id] = d.draftText));
      setEditingDrafts(editState);
      setLoading(false);
    }
    fetchDrafts();
  }, []);

  const handleChange = (id: number, value: string) => {
    setEditingDrafts(prev => ({ ...prev, [id]: value }));
  };

  // Send draft to Cedar HIL to get suggestions
  const handleCedarSuggest = async (id: number) => {
    setHilLoading(prev => ({ ...prev, [id]: true }));
    const res = await fetch("/api/provider/drafts/hil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: id, draftText: editingDrafts[id] }),
    });
    const data: CedarResponse = await res.json();
    if (data.suggestedText) {
      setEditingDrafts(prev => ({ ...prev, [id]: data.suggestedText }));
    }
    setHilLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleApprove = async (id: number) => {
    const updatedText = editingDrafts[id];
    await fetch("/api/provider/drafts/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: id, finalText: updatedText }),
    });
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  if (loading) return <div className="p-4">Loading drafts...</div>;
  if (!drafts.length) return <div className="p-4 text-gray-600">No drafts available.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">Provider Draft Queue (Cedar HIL)</h1>
      {drafts.map(draft => (
        <div key={draft.id} className="border rounded-lg p-4 bg-white shadow space-y-2">
          <textarea
            className="w-full border rounded p-2"
            rows={5}
            value={editingDrafts[draft.id]}
            onChange={(e) => handleChange(draft.id, e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={() => handleCedarSuggest(draft.id)}
              disabled={hilLoading[draft.id]}
            >
              {hilLoading[draft.id] ? "Suggesting..." : "Cedar Suggest"}
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => handleApprove(draft.id)}
            >
              Approve & Send
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
