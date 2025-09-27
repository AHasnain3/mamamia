import Link from "next/link";
import Image from "next/image";
import {
  MessageCircleQuestion,
  NotebookPen,
  HeartPulse,
  History,
} from "lucide-react";

export default function MotherPage() {
  const preferredName = "Mama";

  const lift =
    "transform-gpu transition-transform duration-200 ease-out will-change-transform hover:scale-[1.03] md:hover:scale-[1.05]";

  const baseCard =
    "relative group isolate rounded-lg border border-neutral-200/60 bg-white/80 " +
    "backdrop-blur [@supports(backdrop-filter:blur(0))]:bg-white/70 " +
    "shadow-sm transition-[box-shadow,transform,background-color,border-color] duration-200";

  const withHaloAndFill = (
    haloBg: string,
    fillBg: string,
    ringClass: string,
    borderHover: string,
    shadow: string
  ) =>
    [
      baseCard,
      lift,
      "overflow-visible",
      "after:content-[''] after:absolute after:-inset-3 after:-z-10 after:rounded-[14px] after:opacity-0",
      "after:blur-2xl after:transition-opacity after:duration-200",
      haloBg,
      "group-hover:after:opacity-100",
      fillBg,
      borderHover,
      "ring-0 group-hover:ring-2 ring-offset-0",
      ringClass,
      shadow,
    ].join(" ");

  return (
    <main className="h-dvh relative isolate grid grid-rows-[auto_2fr_1fr] font-sans tracking-tight">
      {/* dark canvas + radial purple glow */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)]" />

      {/* Stage header */}
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

      {/* Top row */}
      <section className="border min-h-0 bg-sky-200 p-3 overflow-visible">
        <div className="h-full grid grid-cols-3 max-md:grid-cols-1 gap-3 overflow-visible">
          {/* Mood & Well-Being (larger yoga image) */}
          <Link
            href="/mother/mood_well_being"
            className={withHaloAndFill(
              "after:bg-orange-500/45",
              "group-hover:bg-orange-500/30",
              "group-hover:ring-orange-400/70",
              "group-hover:border-orange-300/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(234,88,12,0.55)]"
            )}
          >
            <div className="relative z-[1] p-6 h-full flex flex-col">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-8 w-8 text-neutral-900" aria-hidden />
                <h2 className="text-2xl font-semibold text-neutral-900">
                  Mood & Well-Being Center
                </h2>
              </div>

              {/* BIG image area */}
              <div className="flex-1 relative my-2 min-h-[220px] md:min-h-[280px] lg:min-h-[340px]">
                <Image
                  src="/yoga.png"
                  alt="Yoga for wellbeing"
                  fill
                  className="object-contain"
                  priority={false}
                />
              </div>

              <p className="mt-2 text-sm text-neutral-700">
                Quick check-ins, gentle suggestions, and self-care prompts.
              </p>
              <div className="mt-1 text-sm text-neutral-600">
                Start a 2-minute check-in →
              </div>
            </div>
          </Link>

          {/* Greeting */}
          <Link
            href="/mother/basic_info"
            className={withHaloAndFill(
              "after:bg-emerald-600/40",
              "group-hover:bg-emerald-600/28",
              "group-hover:ring-emerald-400/70",
              "group-hover:border-emerald-300/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(5,150,105,0.52)]"
            )}
          >
            <div className="relative z-[1] p-6 h-full flex flex-col justify-center text-center">
              <h2 className="text-3xl font-bold text-neutral-900">Hi {preferredName}!</h2>
              <p className="mt-3 text-base text-neutral-700">
                You’re doing an amazing job. Let’s take today one tiny step at a time. 💛
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Tip: short naps and hydration can lift mood more than we expect.
              </p>
              <div className="mt-4 text-xs text-neutral-500">
                Tap to review or update your Basic Info →
              </div>
            </div>
          </Link>

          {/* Timeline (larger timeline image) */}
          <Link
            href="/mother/timeline"
            className={withHaloAndFill(
              "after:bg-sky-600/45",
              "group-hover:bg-sky-600/30",
              "group-hover:ring-sky-400/70",
              "group-hover:border-sky-300/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(2,132,199,0.55)]"
            )}
          >
            <div className="relative z-[1] p-6 h-full flex flex-col">
              <div className="flex items-center gap-3">
                <History className="h-8 w-8 text-neutral-900" aria-hidden />
                <h2 className="text-2xl font-semibold text-neutral-900">Timeline</h2>
              </div>

              {/* BIG image area */}
              <div className="flex-1 relative my-2 min-h-[220px] md:min-h-[280px] lg:min-h-[340px]">
                <Image
                    src="/timeline-demo.png"
                    alt="Activity timeline"
                    fill
                    className="object-contain"
                    priority={false}
                />
              </div>

              <p className="mt-2 text-sm text-neutral-700">
                See your recent activity, check-ins, and trends.
              </p>
              <div className="mt-1 text-xs text-neutral-600">(Display charts here)</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Bottom row */}
      <section className="border min-h-0 bg-sky-200 p-3 overflow-visible">
        <div className="h-full grid grid-cols-3 max-md:grid-cols-1 gap-3 overflow-visible">
          {/* Diary (unchanged layout) */}
          <Link
            href="/mother/diary"
            className={[
              baseCard,
              lift,
              "overflow-visible",
              "after:content-[''] after:absolute after:-inset-3 after:-z-10 after:rounded-[14px] after:opacity-0",
              "after:bg-neutral-900/75 after:blur-2xl after:transition-opacity after:duration-200",
              "group-hover:after:opacity-100",
              "group-hover:bg-neutral-900/85 group-hover:border-neutral-700/80",
              "ring-0 group-hover:ring-2 ring-offset-0 group-hover:ring-neutral-600/70",
              "hover:shadow-[0_18px_60px_-12px_rgba(10,10,10,0.65)]",
              "md:col-span-2",
            ].join(" ")}
          >
            <div className="relative z-[1] p-6 h-full flex flex-col items-center text-center">
              <NotebookPen className="h-8 w-8 mb-3 text-neutral-900" aria-hidden />
              <h3 className="text-xl font-semibold text-neutral-900">Diary</h3>
              <p className="mt-2 text-sm text-neutral-700">Daily notes and voice journaling.</p>
              <div className="mt-auto w-full">
                <div className="mt-4 w-full border border-neutral-300/70 px-3 py-2 text-sm flex items-center justify-center bg-white/60">
                  <span className="text-neutral-800">Make Diary Entry →</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Ask — default input-like box */}
          <Link
            href="/mother/ask"
            className={withHaloAndFill(
              "after:bg-white/70",
              "group-hover:bg-white/80",
              "group-hover:ring-white/70",
              "group-hover:border-white/80",
              "hover:shadow-[0_18px_60px_-12px_rgba(255,255,255,0.45)]"
            )}
          >
            <div className="relative z-[1] p-6 h-full flex flex-col">
              <div className="flex items-center gap-3">
                <MessageCircleQuestion className="h-6 w-6 text-neutral-900" aria-hidden />
                <div>
                  <h3 className="text-lg font-semibold leading-none text-neutral-900">Ask</h3>
                </div>
              </div>

              <div className="mt-4 border border-neutral-300/70 px-3 py-2 bg-white/70">
                <p className="text-sm text-neutral-700">
                  Send a question (optionally relay to your provider)
                </p>
              </div>

              <div className="mt-auto flex justify-end text-neutral-800">
                <span aria-hidden>→</span>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
