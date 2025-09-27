// app/provider/emotional_status/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Needed for Prisma

// Convert MoodScore enum to a numeric value for plotting
const moodScoreValue = (mood: "VERY_LOW" | "LOW" | "NEUTRAL" | "HIGH" | "VERY_HIGH") => {
  switch (mood) {
    case "VERY_LOW":
      return 1;
    case "LOW":
      return 2;
    case "NEUTRAL":
      return 3;
    case "HIGH":
      return 4;
    case "VERY_HIGH":
      return 5;
    default:
      return 3;
  }
};

// Fetch first mother and recent data
async function getMotherData() {
  const mother = await prisma.motherProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      preferredName: true,
      ppdStage: true,
      diaryEntries: {
        orderBy: { date: "desc" },
        take: 14,
        select: { date: true, redactedNotes: true, riskSignal: true },
      },
      checkIns: {
        orderBy: { date: "desc" },
        take: 14,
        select: { date: true, mood: true },
      },
    },
  });

  if (!mother) return null;

  // Map mood scores to numbers
  const moodHistory = mother.checkIns.map((c) => ({
    date: c.date,
    value: moodScoreValue(c.mood),
  }));

  return { mother, moodHistory, diaryEntries: mother.diaryEntries };
}

export default async function EmotionalStatusPage() {
  const data = await getMotherData();
  if (!data) return <div>No mother data found.</div>;

  const { mother, moodHistory, diaryEntries } = data;

  // Determine the latest diary risk signal
  const latestDiary = diaryEntries[0];

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-4">Emotional Status: {mother.preferredName}</h1>

      {/* Mood Trend */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Mood Trend (last 14 days)</h2>
        <div className="w-full h-60 relative">
          {/* Placeholder graph - replace with chart library */}
          <Image
            src="/mood-graph-placeholder.png"
            alt="Mood trend graph"
            fill
            className="object-contain"
          />
        </div>
        <p className="mt-3 text-sm text-neutral-800/90">
          Mood values from diary check-ins. 1 = Very Low, 5 = Very High.
        </p>
      </section>

      {/* Risk Summary */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">PPD / PMAD Risk</h2>
        <p className="text-lg">
          Current PPD Stage: <span className="font-bold">{mother.ppdStage}</span>
        </p>
        {latestDiary ? (
          <p className="text-lg mt-2">
            Latest Diary Risk:{" "}
            <span
              className={`font-bold ${
                latestDiary.riskSignal === "RED"
                  ? "text-red-600"
                  : latestDiary.riskSignal === "YELLOW"
                  ? "text-yellow-500"
                  : "text-green-600"
              }`}
            >
              {latestDiary.riskSignal}
            </span>
          </p>
        ) : (
          <p className="text-neutral-600 mt-2">No diary entries yet.</p>
        )}
      </section>

      {/* Diary Highlights */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Diary Highlights</h2>
        {diaryEntries.length === 0 ? (
          <p>No diary entries to summarize.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {diaryEntries.map((d, idx) => (
              <li
                key={idx}
                className="border-l-4 pl-3 py-1 bg-white/50 rounded shadow-sm"
              >
                <p className="text-sm text-neutral-700">
                  <span className="font-semibold">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d.date)}
                  </span>{" "}
                  - Risk:{" "}
                  <span
                    className={
                      d.riskSignal === "RED"
                        ? "text-red-600 font-bold"
                        : d.riskSignal === "YELLOW"
                        ? "text-yellow-500 font-bold"
                        : "text-green-600 font-bold"
                    }
                  >
                    {d.riskSignal ?? "GREEN"}
                  </span>
                </p>
                <p className="text-sm text-neutral-800 mt-1">{d.redactedNotes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Visual Emotional Summary */}
      <section className="border rounded-lg p-6 shadow-sm bg-white/80">
        <h2 className="text-2xl font-semibold mb-3">Emotional Overview</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-orange-100 rounded-lg p-4 shadow-sm">
            <Image src="/emoji-sad.png" alt="Sad" width={48} height={48} />
            <p className="mt-2 text-sm font-medium">Low Mood Days</p>
            <p className="text-lg font-bold">
              {moodHistory.filter((m) => m.value <= 2).length}
            </p>
          </div>
          <div className="bg-yellow-100 rounded-lg p-4 shadow-sm">
            <Image src="/emoji-neutral.png" alt="Neutral" width={48} height={48} />
            <p className="mt-2 text-sm font-medium">Neutral Mood Days</p>
            <p className="text-lg font-bold">
              {moodHistory.filter((m) => m.value === 3).length}
            </p>
          </div>
          <div className="bg-green-100 rounded-lg p-4 shadow-sm">
            <Image src="/emoji-happy.png" alt="Happy" width={48} height={48} />
            <p className="mt-2 text-sm font-medium">High Mood Days</p>
            <p className="text-lg font-bold">
              {moodHistory.filter((m) => m.value >= 4).length}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
