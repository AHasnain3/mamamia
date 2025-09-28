// app/provider/physical_status/page.tsx
import { prisma } from "@/lib/prisma";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export const runtime = "nodejs";

type PhysicalHistoryItem = {
  date: string;
  sleepMin: number | null;
  painScore: number | null;
  bleeding: string | null;
  feeding: string | null;
  restingHr: number | null;
  steps: number | null;
  hrvMs: number | null;
};

async function getMotherData() {
  const mother = await prisma.motherProfile.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      checkIns: { orderBy: { date: "desc" }, take: 14 },
      wearable: { orderBy: { date: "desc" }, take: 14 },
    },
  });

  if (!mother) return null;

  const physicalHistory: PhysicalHistoryItem[] = [];
  for (let i = 0; i < 14; i++) {
    const checkIn = mother.checkIns?.[i] ?? null;
    const wearable = mother.wearable?.[i] ?? null;

    physicalHistory.push({
      date: checkIn?.date?.toISOString() ?? wearable?.date?.toISOString() ?? new Date().toISOString(),
      sleepMin: checkIn?.sleepMin ?? wearable?.sleepMin ?? null,
      painScore: checkIn?.painScore ?? null,
      bleeding: checkIn?.bleeding ?? null,
      feeding: checkIn?.feeding ?? null,
      restingHr: wearable?.restingHr ?? null,
      steps: wearable?.steps ?? null,
      hrvMs: wearable?.hrvMs ?? null,
    });
  }

  return { mother, physicalHistory };
}

export default async function PhysicalStatusPage() {
  const data = await getMotherData();
  if (!data) return <div className="p-6 text-center text-neutral-400">No mother data found.</div>;

  const { mother, physicalHistory } = data;
  const latest = physicalHistory[0];

  const fmtSleep = (m?: number | null) =>
    m != null ? `${Math.floor(m / 60)}h ${m % 60}m` : "—";
  const val = (x?: number | null, suffix = "") => (x ?? "—") + suffix;

  const hasData = physicalHistory.some(
    item => item.sleepMin != null || item.painScore != null || item.restingHr != null || item.steps != null || item.hrvMs != null
  );

  return (
    <main className="relative min-h-screen p-8 max-w-5xl mx-auto space-y-8">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 pointer-events-none
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      <h1 className="text-3xl font-bold text-neutral-50 text-center mb-6">
        Physical Status: {mother.preferredName}
      </h1>

      {/* Latest Vitals Summary */}
      <section className="border rounded-lg p-6 shadow-sm bg-neutral-800/20 text-neutral-50">
        <h2 className="text-2xl font-semibold mb-4">Recent Vitals & Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-blue-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Resting HR</p>
            <p className="text-xl font-bold">{val(latest.restingHr, " bpm")}</p>
          </div>
          <div className="bg-green-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Sleep</p>
            <p className="text-xl font-bold">{fmtSleep(latest.sleepMin)}</p>
          </div>
          <div className="bg-orange-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Steps</p>
            <p className="text-xl font-bold">{val(latest.steps)}</p>
          </div>
          <div className="bg-purple-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">HRV</p>
            <p className="text-xl font-bold">{val(latest.hrvMs, " ms")}</p>
          </div>
        </div>
      </section>

      {/* Symptoms */}
      <section className="border rounded-lg p-6 shadow-sm bg-neutral-800/20 text-neutral-50">
        <h2 className="text-2xl font-semibold mb-4">Symptoms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-red-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Pain Score</p>
            <p className="text-xl font-bold">{val(latest.painScore)}</p>
          </div>
          <div className="bg-pink-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Bleeding</p>
            <p className="text-xl font-bold">{latest.bleeding ?? "—"}</p>
          </div>
          <div className="bg-yellow-800/30 rounded-lg p-4">
            <p className="text-sm font-medium">Feeding</p>
            <p className="text-xl font-bold">{latest.feeding ?? "—"}</p>
          </div>
        </div>
      </section>

      {/* Trends */}
      <section className="border rounded-lg p-6 shadow-sm bg-neutral-800/20 text-neutral-50">
        <h2 className="text-2xl font-semibold mb-4">Recent Trends (14 days)</h2>
        {hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resting HR & Sleep */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={physicalHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#f9fafb' }} />
                <Legend />
                <Line type="monotone" dataKey="restingHr" stroke="#3b82f6" name="Resting HR" />
                <Line type="monotone" dataKey="sleepMin" stroke="#10b981" name="Sleep (min)" />
              </LineChart>
            </ResponsiveContainer>

            {/* Steps & HRV */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={physicalHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#f9fafb' }} />
                <Legend />
                <Line type="monotone" dataKey="steps" stroke="#f97316" name="Steps" />
                <Line type="monotone" dataKey="hrvMs" stroke="#8b5cf6" name="HRV (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-neutral-400">No data available yet.</p>
        )}
      </section>
    </main>
  );
}
