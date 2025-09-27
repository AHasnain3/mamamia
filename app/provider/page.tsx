import Link from "next/link";
import Image from "next/image";
import { Brain, HeartPulse, NotebookPen, ClipboardCheck, Users } from "lucide-react";

export default function ProviderPage() {
  const hoverLift =
    "transform-gpu transition-transform duration-200 ease-out will-change-transform md:hover:scale-[1.05]";
  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-400 focus-visible:ring-offset-white/70";
  const baseCard =
    "relative group isolate rounded-lg border border-neutral-200 bg-white/80 backdrop-blur [@supports(backdrop-filter:blur(0))]:bg-white/70 shadow-sm transition-[box-shadow,transform,background-color,border-color] duration-200 flex flex-col min-h-0 overflow-hidden p-6";
  const withHalo = (haloBg: string, ringClass: string, shadow: string) =>
    [
      baseCard,
      hoverLift,
      focusRing,
      "overflow-visible",
      "after:content-[''] after:absolute after:-inset-3 after:-z-10 after:rounded-[14px] after:opacity-0 after:blur-2xl",
      "after:transition-opacity after:duration-200 motion-reduce:after:transition-none",
      haloBg,
      "group-hover:after:opacity-100",
      "ring-0 group-hover:ring-2 ring-offset-0",
      ringClass,
      shadow,
    ].join(" ");

  return (
    <main className="h-dvh relative isolate grid grid-rows-[auto_2fr_1fr] font-sans tracking-tight">
      {/* Pastel blue canvas + soft radial */}
      <div className="absolute inset-0 -z-20 bg-sky-200" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_50%_-10%,rgba(199,210,254,0.65),rgba(255,255,255,0.6)_35%,transparent_70%)]" />

      {/* ===== Provider Console (top bar) — exact tint, CSS-only hover ===== */}
      <section className="border">
        <div className="backdrop-blur-[1px] py-4 md:py-6 transition-colors bg-[rgba(147,51,234,0.26)] hover:bg-[rgba(147,51,234,0.40)]">
          <div className="grid grid-cols-3 items-center px-3 md:px-4">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-50">Provider Console</h2>
            <p className="text-sm text-center text-neutral-100/90 font-medium">Care team workspace</p>
            <div className="justify-self-end">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm bg-black text-white border border-black md:hover:bg-neutral-800 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-200"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Top row: Emotional • Patient Overview • Physical ===== */}
      <section className="border min-h-0 px-3 py-3">
        <div className="h-full grid grid-cols-3 max-md:grid-cols-1 gap-3">
          {/* Emotional Status — orange halo + mini-graph */}
          <Link
            href="/provider/emotional_status"
            aria-label="Open Emotional Status"
            className={withHalo(
              "after:bg-orange-500/45",
              "group-hover:ring-orange-400/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(234,88,12,0.55)]"
            )}
          >
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-neutral-900" aria-hidden />
              <h2 className="text-2xl font-semibold text-neutral-900">Emotional Status</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-800/90">
              Sentiment trends and PPD/PMAD risk flags.
            </p>

            {/* Sample graph image */}
            <div className="mt-3 rounded-md overflow-hidden border border-neutral-200 bg-white/70">
              <div className="relative aspect-[16/7]">
                <Image
                  src="/emotion-graph.png"
                  alt="Sample emotional sentiment graph"
                  fill
                  className="object-cover"
                  sizes="(max-width:768px) 100vw, 33vw"
                  priority
                />
              </div>
            </div>

            <div className="mt-auto text-sm text-neutral-900">View insights →</div>
          </Link>

          {/* Patient Overview — emerald halo + patient photo */}
          <Link
            href="/provider/basic_info"
            aria-label="Open Patient Overview and basic info"
            className={withHalo(
              "after:bg-emerald-600/40",
              "group-hover:ring-emerald-400/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(5,150,105,0.52)]"
            )}
          >
            <div className="flex items-center justify-center gap-3 text-center">
              <Users className="h-7 w-7 text-neutral-900" aria-hidden />
              <h2 className="text-2xl font-bold text-neutral-900">Patient Overview</h2>
            </div>

            {/* Patient avatar in the corner */}
            <div className="relative mt-3">
              <div className="absolute right-0 -top-2 h-14 w-14 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <Image
                  src="/patient.jpg"
                  alt="Current patient profile photo"
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
            </div>

            <p className="mt-8 text-sm text-neutral-800/90 text-center">
              Snapshot of recent notes, check-ins, and changes.
            </p>
            <p className="mt-2 text-xs text-neutral-700 text-center">
              Tap to open basic info & profile →
            </p>
          </Link>

          {/* Physical Status — sky halo + vitals bullets */}
          <Link
            href="/provider/physical_status"
            aria-label="Open Physical Status"
            className={withHalo(
              "after:bg-sky-600/45",
              "group-hover:ring-sky-400/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(2,132,199,0.55)]"
            )}
          >
            <div className="flex items-center gap-3">
              <HeartPulse className="h-7 w-7 text-neutral-900" aria-hidden />
              <h2 className="text-2xl font-semibold text-neutral-900">Physical Status</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-800/90">
              Pain, bleeding, sleep, feeding, vitals.
            </p>

            {/* Quick vitals */}
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-900">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">BP:</span> 118/76 mmHg (sitting)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">HR:</span> 78 bpm (resting)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Temp:</span> 98.3°F (36.8°C)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Sleep (last night):</span> 6h 40m</span>
              </li>
            </ul>

            <div className="mt-auto text-sm text-neutral-900">Review metrics →</div>
          </Link>
        </div>
      </section>

      {/* ===== Bottom row: Draft Queue • Diary Summary ===== */}
      <section className="border min-h-0 px-3 pb-3">
        <div className="h-full grid grid-cols-2 max-md:grid-cols-1 gap-3">
          <Link
            href="/provider/drafts"
            aria-label="Open Draft Queue"
            className={withHalo(
              "after:bg-violet-600/45",
              "group-hover:ring-violet-400/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(139,92,246,0.55)]"
            )}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-7 w-7 text-neutral-900" aria-hidden />
              <h3 className="text-xl font-semibold text-neutral-900">Draft Queue</h3>
            </div>
            <p className="mt-2 text-sm text-neutral-800/90">
              AI-suggested responses awaiting your review and edits.
            </p>
            <div className="mt-auto w-full">
              <div className="mt-3 w-full border border-neutral-300/70 px-3 py-2 text-sm flex items-center justify-center bg-white/60 rounded">
                <span className="text-neutral-900">Review AI Drafts →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/provider/diary_summary"
            aria-label="Open Diary Summary"
            className={withHalo(
              "after:bg-neutral-900/75",
              "group-hover:ring-neutral-700/60",
              "hover:shadow-[0_18px_60px_-12px_rgba(10,10,10,0.65)]"
            )}
          >
            <div className="flex items-center gap-3">
              <NotebookPen className="h-7 w-7 text-neutral-900" aria-hidden />
              <h3 className="text-xl font-semibold text-neutral-900">Diary Summary</h3>
            </div>
            <p className="mt-2 text-sm text-neutral-800/90">
              Condensed daily notes with AI clustering of topics and concerns.
            </p>
            <div className="mt-auto w-full">
              <div className="mt-3 w-full border border-neutral-300/70 px-3 py-2 text-sm flex items-center justify-center bg-white/60 rounded">
                <span className="text-neutral-900">Open summarized diary →</span>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
