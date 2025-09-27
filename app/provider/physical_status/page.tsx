// app/provider/physical_status/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Fetch first mother and recent physical data
async function getMotherData() {
  const mother = await prisma.motherProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      preferredName: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 14,
        select: {
          date: true,
          sleepMin: true,
          painScore: true,
          bleeding: true,
          feeding: true,
        },
      },
      wearable: {
        orderBy: { date: "desc" },
        take: 14,
        select: { date: true, restingHr: true, steps: true, hrvMs: true, sleepMin: true },
    },
    },
  });

  if (!mother) return null;

  // Merge wearable & check-in data
  const physicalHistory = [];
  for (let i = 0; i < 14; i++) {
    const checkIn = mother.checkIns[i];
    const wearable = mother.wearable[i]; // ✅ use this

    physicalHistory.push({
      date: checkIn?.date ?? wearable?.date ?? new Date(),
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
  if (!data) return <div>No mother data found.</div>;

  const { mother, physicalHistory } = data;

  // Latest values
  const latest = physicalHistory[0];

  const fmtSleep = (m?: number | null) =>
    m ? `${Math.floor(m / 60)}h ${m % 60}m` : "—";
  const val = (x?: number | null, suffix = "") => (x ?? "—") + suffix;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-4">Physical Status: {mother.preferredName}</h1>

      {/* Vitals Summary */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Recent Vitals & Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-blue-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Resting HR</p>
            <p className="text-xl font-bold">{val(latest.restingHr, " bpm")}</p>
          </div>
          <div className="bg-green-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Sleep</p>
            <p className="text-xl font-bold">{fmtSleep(latest.sleepMin)}</p>
          </div>
          <div className="bg-orange-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Steps</p>
            <p className="text-xl font-bold">{val(latest.steps)}</p>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">HRV</p>
            <p className="text-xl font-bold">{val(latest.hrvMs, " ms")}</p>
          </div>
        </div>
      </section>

      {/* Pain, Bleeding, Feeding */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Symptoms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-red-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Pain Score</p>
            <p className="text-xl font-bold">{val(latest.painScore)}</p>
          </div>
          <div className="bg-pink-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Bleeding</p>
            <p className="text-xl font-bold">{latest.bleeding}</p>
          </div>
          <div className="bg-yellow-100 rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium">Feeding</p>
            <p className="text-xl font-bold">{latest.feeding}</p>
          </div>
        </div>
      </section>

      {/* Trend Graphs */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Recent Trends (14 days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full h-60 relative">
            <Image
              src="/physical-hr-sleep-placeholder.png"
              alt="Heart rate & sleep trend"
              fill
              className="object-contain"
            />
            <p className="mt-2 text-sm text-neutral-700">Resting HR & Sleep Trend</p>
          </div>
          <div className="w-full h-60 relative">
            <Image
              src="/physical-steps-hrv-placeholder.png"
              alt="Steps & HRV trend"
              fill
              className="object-contain"
            />
            <p className="mt-2 text-sm text-neutral-700">Steps & HRV Trend</p>
          </div>
        </div>
      </section>
    </main>
  );
}
