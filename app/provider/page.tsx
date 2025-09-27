import Link from "next/link";
import { Brain, HeartPulse, NotebookPen, Info } from "lucide-react";

export default function ProviderPage() {
  const providerName = "Provider";

  return (
    <main className="h-dvh relative isolate grid grid-rows-[auto_2fr_1fr]">
      {/* dark canvas + brighter radial glow */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="pointer-events-none absolute inset-0 -z-10
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      {/* ===== STAGE (translucent purple) ===== */}
      <section className="border">
        <div className="bg-purple-600/26 hover:bg-purple-600/40 backdrop-blur-[1px] py-4 md:py-6 transition-colors">
          <div className="grid grid-cols-3 items-center px-3 md:px-4">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-50">Stage</h2>
            <p className="text-sm text-center text-neutral-200 font-medium">Current stage</p>
            <div className="justify-self-end">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm bg-black text-white border border-black hover:bg-neutral-800 transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TOP GRID (translucent → more opaque on hover) ===== */}
      <section className="border min-h-0">
        <div
          className="h-full grid grid-cols-3 max-md:grid-cols-1
                     md:divide-x divide-y-0 md:divide-y-0 max-md:divide-x-0 max-md:divide-y
                     divide-border"
        >
          {/* Emotional (orange 600: 24% → 55%) */}
          <Link
            href="/provider/emotional_status"
            className="p-6 flex flex-col h-full
                       bg-orange-600/24 hover:bg-orange-600/55 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Emotional Status</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-200">
              Sentiment trends and PPD/PMAD risk flags.
            </p>
            <div className="mt-auto text-sm text-neutral-300">View insights →</div>
          </Link>

          {/* Overview (emerald 600: 24% → 55%) */}
          <Link
            href="/provider/diary_summary"
            className="p-6 flex flex-col justify-center text-center h-full
                       bg-emerald-600/24 hover:bg-emerald-600/55 transition-colors
                       text-neutral-50"
          >
            <h2 className="text-3xl font-bold">Patient Overview</h2>
            <p className="mt-3 text-base text-neutral-200">
              Hi {providerName}, snapshot of recent notes, check-ins, and changes.
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              Tap to open summarized diary and suggested follow-ups.
            </p>
          </Link>

          {/* Physical (sky 600: 24% → 55%) */}
          <Link
            href="/provider/physical_status"
            className="p-6 flex flex-col h-full
                       bg-sky-600/24 hover:bg-sky-600/55 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Physical Status</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-200">Pain, bleeding, sleep, feeding, vitals.</p>
            <div className="mt-auto text-sm text-neutral-300">Review metrics →</div>
          </Link>
        </div>
      </section>

      {/* ===== BOTTOM GRID ===== */}
      <section className="border min-h-0">
        <div
          className="h-full grid grid-cols-3 max-md:grid-cols-1
                     md:divide-x divide-y-0 md:divide-y-0 max-md:divide-x-0 max-md:divide-y
                     divide-border"
        >
          {/* Diary Summary (solid black) */}
          <Link
            href="/provider/diary_summary"
            className="group bg-black text-white p-6 flex flex-col h-full md:col-span-2"
          >
            <div className="flex items-center gap-3">
              <NotebookPen className="h-7 w-7" aria-hidden />
              <h3 className="text-xl font-semibold">Diary Summary</h3>
            </div>
            <p className="mt-2 text-sm text-white/90">
              Condensed daily notes with AI clustering of topics and concerns.
            </p>
            <div className="mt-auto">
              <div className="mt-4 w-full border border-white/40 px-3 py-2 text-sm flex items-center justify-center
                              bg-white/10 group-hover:bg-white/20 transition">
                Open summarized diary →
              </div>
            </div>
          </Link>

          {/* Basic Info (white: 18% → 40%) */}
          <Link
            href="/provider/basic_info"
            className="p-6 flex flex-col h-full
                       bg-white/18 hover:bg-white/40 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <Info className="h-7 w-7" aria-hidden />
              <h3 className="text-xl font-semibold">Basic Info</h3>
            </div>
            <p className="mt-2 text-sm text-neutral-200">
              Delivery details, preferences, care contacts.
            </p>
            <div className="mt-auto flex justify-end text-neutral-50">
              <span aria-hidden>→</span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
