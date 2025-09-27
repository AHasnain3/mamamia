import Link from "next/link";
import {
  MessageCircleQuestion,
  NotebookPen,
  HeartPulse,
  History,
} from "lucide-react";

export default function MotherPage() {
  const preferredName = "Mama";

  return (
    <main className="h-dvh relative isolate grid grid-rows-[auto_2fr_1fr]">
      {/* dark canvas + brighter radial glow */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="pointer-events-none absolute inset-0 -z-10
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      {/* ===== STAGE (translucent purple, stronger on hover) ===== */}
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
          {/* Mood & Well-Being (orange 600: 24% → 55%) */}
          <Link
            href="/mother/mood_well_being"
            className="p-6 flex flex-col h-full
                       bg-orange-600/24 hover:bg-orange-600/55 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Mood & Well-Being Center</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-200">
              Quick check-ins, gentle suggestions, and self-care prompts.
            </p>
            <div className="mt-auto pt-6 text-sm text-neutral-300">
              Start a 2-minute check-in →
            </div>
          </Link>

          {/* Greeting (emerald 600: 24% → 55%) */}
          <Link
            href="/mother/basic_info"
            className="p-6 flex flex-col justify-center text-center h-full
                       bg-emerald-600/24 hover:bg-emerald-600/55 transition-colors
                       text-neutral-50"
          >
            <h2 className="text-3xl font-bold">Hi {preferredName}!</h2>
            <p className="mt-3 text-base text-neutral-200">
              You’re doing an amazing job. Let’s take today one tiny step at a time. 💛
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              Tip: short naps and hydration can lift mood more than we expect.
            </p>
            <div className="mt-4 text-xs text-neutral-300">
              Tap to review or update your Basic Info →
            </div>
          </Link>

          {/* Timeline (sky 600: 24% → 55%) */}
          <Link
            href="/mother/timeline"
            className="p-6 flex flex-col h-full
                       bg-sky-600/24 hover:bg-sky-600/55 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <History className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Timeline</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-200">
              See your recent activity, check-ins, and trends.
            </p>
            <div className="mt-auto text-xs text-neutral-300">(Display charts here)</div>
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
          {/* Diary (solid black for max contrast) */}
          <Link
            href="/mother/diary"
            className="group bg-black text-white p-6 flex flex-col items-center text-center h-full md:col-span-2"
          >
            <NotebookPen className="h-8 w-8 mb-3" aria-hidden />
            <h3 className="text-xl font-semibold">Diary</h3>
            <p className="mt-2 text-sm text-white/90">Daily notes and voice journaling.</p>
            <div className="mt-auto w-full">
              <div className="mt-4 w-full border border-white/40 px-3 py-2 text-sm flex items-center justify-center
                              bg-white/10 group-hover:bg-white/20 transition">
                Make Diary Entry →
              </div>
            </div>
          </Link>

          {/* Ask (white overlay: 18% → 40%) */}
          <Link
            href="/mother/ask"
            className="p-6 flex flex-col h-full
                       bg-white/18 hover:bg-white/40 transition-colors
                       text-neutral-50"
          >
            <div className="flex items-center gap-3">
              <MessageCircleQuestion className="h-6 w-6" aria-hidden />
              <div>
                <h3 className="text-lg font-semibold leading-none">Ask</h3>
                <p className="mt-1 text-xs text-neutral-200">
                  Send a question (optionally relay to your provider)
                </p>
              </div>
            </div>
            <div className="mt-auto flex justify-end text-neutral-50">
              <span aria-hidden>→</span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
