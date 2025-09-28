// app/emotional_status/EmotionalCharts.tsx
'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type MoodPoint = { date: string; mood: number };
type RiskPoint = { risk: "RED" | "YELLOW" | "GREEN"; count: number };
type Highlight = { date: string; note: string | null };

export default function EmotionalCharts({
  moodData,
  riskData,
  highlights,
}: {
  moodData: MoodPoint[];
  riskData: RiskPoint[];
  highlights: Highlight[];
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Mood Trend */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Mood Over Time</h2>
        {moodData.length === 0 ? (
          <p className="text-sm text-gray-600">No mood check-ins available.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 5]} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="mood" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Risk Summary */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Risk Signals (Diary Entries)</h2>
        {riskData.reduce((s, r) => s + r.count, 0) === 0 ? (
          <p className="text-sm text-gray-600">No diary risk signals recorded yet.</p>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count">
                  {riskData.map((entry, idx) => {
                    const color = entry.risk === "RED" ? "#ef4444" : entry.risk === "YELLOW" ? "#f59e0b" : "#10b981";
                    return <Cell key={idx} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Diary Highlights */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Diary Highlights</h2>
        {highlights.length === 0 ? (
          <p className="text-sm text-gray-600">No diary highlights yet.</p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {highlights.map((h, i) => (
              <li key={i} className="border-l-4 pl-3 py-2 bg-gray-50 rounded">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">{h.date}</div>
                  <div className="text-xs text-gray-500">redacted</div>
                </div>
                <p className="text-sm text-gray-700 mt-1">{h.note ?? "No redacted summary."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
