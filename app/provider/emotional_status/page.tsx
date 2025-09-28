// app/emotional_status/page.tsx
import EmotionalCharts from "./emotional_charts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MoodPoint = { date: string; mood: number };
type RiskPoint = { risk: "RED" | "YELLOW" | "GREEN"; count: number };
type Highlight = { date: string; note: string | null };

function mapMood(mood: string | null | undefined): number {
  switch (mood) {
    case "VERY_LOW": return 1;
    case "LOW": return 2;
    case "NEUTRAL": return 3;
    case "HIGH": return 4;
    case "VERY_HIGH": return 5;
    default: return 3;
  }
}

async function getDiaryAndCheckinData(): Promise<{
  motherName: string | null;
  moodData: MoodPoint[];
  riskData: RiskPoint[];
  highlights: Highlight[];
}> {
  const mother = await prisma.motherProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferredName: true },
  });

  if (!mother) return { motherName: null, moodData: [], riskData: [], highlights: [] };

  const checkIns = await prisma.checkIn.findMany({
    where: { motherId: mother.id },
    orderBy: { date: "asc" },
    select: { date: true, mood: true },
  });

  const diaryEntries = await prisma.diaryEntry.findMany({
    where: { motherId: mother.id },
    orderBy: { date: "asc" },
    select: { date: true, redactedNotes: true, riskSignal: true },
  });

  const moodData = checkIns.map(c => ({
    date: c.date.toISOString().split("T")[0],
    mood: mapMood(c.mood as unknown as string),
  }));

  const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
  for (const d of diaryEntries) {
    const r = d.riskSignal ?? "GREEN";
    counts[r]++;
  }
  const riskData: RiskPoint[] = [
    { risk: "RED", count: counts.RED },
    { risk: "YELLOW", count: counts.YELLOW },
    { risk: "GREEN", count: counts.GREEN },
  ];

  const highlights: Highlight[] = diaryEntries
    .slice(-7)
    .reverse()
    .map(d => ({ date: d.date.toISOString().split("T")[0], note: d.redactedNotes ?? null }));

  return { motherName: mother.preferredName ?? null, moodData, riskData, highlights };
}

export default async function EmotionalStatusPage() {
  const { motherName, moodData, riskData, highlights } = await getDiaryAndCheckinData();
  const hasAnyData = moodData.length > 0 || highlights.length > 0;

  return (
    <main className="relative min-h-screen p-8 max-w-5xl mx-auto">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 pointer-events-none
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      <h1 className="text-3xl font-bold text-neutral-50 text-center mb-8">
        Emotional Well-Being Overview{motherName ? ` — ${motherName}` : ""}
      </h1>

      {!hasAnyData ? (
        <div className="mt-20 text-center text-neutral-400 text-lg">
          No data available yet.
        </div>
      ) : (
        <div className="bg-neutral-800/20 p-6 rounded-lg shadow space-y-6">
          <EmotionalCharts moodData={moodData} riskData={riskData} highlights={highlights} />
        </div>
      )}
    </main>
  );
}
