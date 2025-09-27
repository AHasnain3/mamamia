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
    // Full viewport height; 3 rows: stage (auto) + top (2fr) + bottom (1fr)
    <main className="h-dvh grid grid-rows-[auto_2fr_1fr]">
      {/* ===== STAGE (full-bleed, centered status) ===== */}
      <section className="border">
        <div className="bg-background py-4 md:py-6">
          <div className="grid grid-cols-3 items-center px-3 md:px-4">
            <h2 className="text-xl md:text-2xl font-semibold">Stage</h2>
            <p className="text-sm text-muted-foreground text-center">Current stage</p>
            <div className="justify-self-end">
              <Link
                href="/"
                className="border px-3 py-1.5 text-sm hover:bg-accent transition"
                aria-label="Back to Home"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TOP GRID (fills its row; vertical dividers on desktop) ===== */}
      <section className="border min-h-0">
        <div
          className="
            h-full grid grid-cols-3 max-md:grid-cols-1
            md:divide-x divide-y-0 md:divide-y-0 max-md:divide-x-0 max-md:divide-y
            divide-border
          "
        >
          {/* Mood & Well-Being */}
          <Link
            href="/mother/mood_well_being"
            className="bg-background p-6 flex flex-col h-full"
            aria-label="Mood & Well-Being Center"
          >
            <div className="flex items-center gap-3">
              <HeartPulse className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Mood & Well-Being Center</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Quick check-ins, gentle suggestions, and self-care prompts.
            </p>
            <div className="mt-auto pt-6 text-sm text-muted-foreground">
              Start a 2-minute check-in →
            </div>
          </Link>

          {/* Greeting (to Basic Info) */}
          <Link
            href="/mother/basic_info"
            className="bg-background p-6 flex flex-col justify-center text-center h-full
                       bg-gradient-to-br from-amber-50/40 to-rose-50/30 dark:from-zinc-900 dark:to-zinc-900/40"
            aria-label="Open Basic Info"
          >
            <h2 className="text-3xl font-bold">Hi {preferredName}!</h2>
            <p className="mt-3 text-base">
              You’re doing an amazing job. Let’s take today one tiny step at a time. 💛
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tip: short naps and hydration can lift mood more than we expect.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              Tap to review or update your Basic Info →
            </div>
          </Link>

          {/* Timeline */}
          <Link
            href="/mother/timeline"
            className="bg-background p-6 flex flex-col h-full"
            aria-label="Timeline"
          >
            <div className="flex items-center gap-3">
              <History className="h-8 w-8" aria-hidden />
              <h2 className="text-2xl font-semibold">Timeline</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              See your recent activity, check-ins, and trends.
            </p>
            <div className="mt-auto text-xs text-muted-foreground">
              (Display charts here)
            </div>
          </Link>
        </div>
      </section>

      {/* ===== BOTTOM GRID (fills its row; Diary spans 2) ===== */}
      <section className="border min-h-0">
        <div
          className="
            h-full grid grid-cols-3 max-md:grid-cols-1
            md:divide-x divide-y-0 md:divide-y-0 max-md:divide-x-0 max-md:divide-y
            divide-border
          "
        >
          {/* Diary */}
          <Link
            href="/mother/diary"
            className="group bg-background p-6 flex flex-col items-center text-center h-full md:col-span-2"
            aria-label="Diary"
          >
            <NotebookPen className="h-8 w-8 mb-3" aria-hidden />
            <h3 className="text-xl font-semibold">Diary</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Daily notes and voice journaling.
            </p>
            <div className="mt-auto w-full">
              <div className="mt-4 w-full border px-3 py-2 text-sm flex items-center justify-center
                              bg-muted/30 group-hover:bg-accent/40 transition">
                Make Diary Entry →
              </div>
            </div>
          </Link>

          {/* Ask */}
          <Link
            href="/mother/ask"
            className="bg-background p-6 flex flex-col h-full"
            aria-label="Ask a Question"
          >
            <div className="flex items-center gap-3">
              <MessageCircleQuestion className="h-6 w-6" aria-hidden />
              <div>
                <h3 className="text-lg font-semibold leading-none">Ask</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Send a question (optionally relay to your provider)
                </p>
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <span aria-hidden>→</span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
