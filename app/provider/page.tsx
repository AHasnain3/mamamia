// app/provider/page.tsx (replace entire file if easier)
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Brain, HeartPulse, NotebookPen, ClipboardCheck, Users } from "lucide-react";

type PageProps = { searchParams?: { motherId?: string } };

type Risk = "RED" | "YELLOW" | "GREEN";
type Chip = { id: number; name: string; color: Risk };

function riskToColorClasses(r: Risk) {
  switch (r) {
    case "RED":
      return "bg-red-500 ring-red-400/50";
    case "YELLOW":
      return "bg-yellow-400 ring-yellow-300/50";
    default:
      return "bg-emerald-500 ring-emerald-400/50";
  }
}

async function getRecentChips(): Promise<Chip[]> {
  const mothers = await prisma.motherProfile.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, preferredName: true },
  });

  const chips: Chip[] = [];
  for (const m of mothers) {
    const [alert, diary] = await Promise.all([
      prisma.providerAlert.findFirst({
        where: { motherId: m.id },
        orderBy: { createdAt: "desc" },
        select: { signal: true },
      }),
      prisma.diaryEntry.findFirst({
        where: { motherId: m.id, riskSignal: { not: null } },
        orderBy: { date: "desc" },
        select: { riskSignal: true },
      }),
    ]);

    const signal = (alert?.signal ?? diary?.riskSignal ?? "GREEN") as Risk;
    chips.push({ id: m.id, name: m.preferredName, color: signal });
  }

  // If no DB data yet, show 10 samples
  if (chips.length === 0) {
    return [
      { id: 101, name: "Amara K.",   color: "RED"    },
      { id: 102, name: "Bethany R.", color: "YELLOW" },
      { id: 103, name: "Celia D.",   color: "GREEN"  },
      { id: 104, name: "Diana M.",   color: "GREEN"  },
      { id: 105, name: "Elise P.",   color: "YELLOW" },
      { id: 106, name: "Farah L.",   color: "GREEN"  },
      { id: 107, name: "Gina S.",    color: "RED"    },
      { id: 108, name: "Hana T.",    color: "GREEN"  },
      { id: 109, name: "Indira P.",  color: "YELLOW" },
      { id: 110, name: "Juno W.",    color: "GREEN"  },
    ];
  }
  return chips;
}

async function getMotherView(motherIdRaw?: string) {
  const idNum = Number(motherIdRaw);
  if (!motherIdRaw || !Number.isInteger(idNum)) {
    return { mother: null, lastCheckIn: null, lastWearable: null };
  }

  const [mother, lastCheckIn, lastWearable] = await Promise.all([
    prisma.motherProfile.findUnique({
      where: { id: idNum },
      select: { id: true, preferredName: true, photoUrl: true },
    }),
    prisma.checkIn.findFirst({
      where: { motherId: idNum },
      orderBy: { date: "desc" },
      select: {
        date: true,
        sleepMin: true,
        painScore: true,
        bleeding: true,
        feeding: true,
        mood: true,
      },
    }),
    prisma.wearableSample.findFirst({
      where: { motherId: idNum },
      orderBy: { date: "desc" },
      select: { date: true, restingHr: true, sleepMin: true, steps: true, hrvMs: true },
    }),
  ]);

  return { mother, lastCheckIn, lastWearable };
}

export default async function ProviderPage({ searchParams }: PageProps) {
  // 1) Get chips first (so we can default-select the leftmost)
  const chips = await getRecentChips();

  // 2) Selected id: URL wins; otherwise default to the first chip
  const selectedId =
    (searchParams?.motherId && String(searchParams.motherId)) ||
    (chips[0]?.id ? String(chips[0].id) : undefined);

  // 3) Load details for the selected id
  const { mother, lastCheckIn, lastWearable } = await getMotherView(selectedId);

  // 4) Helpers that depend on the selected id
  const hoverLift =
    "transform-gpu transition-transform duration-200 ease-out will-change-transform md:hover:scale-[1.05]";
  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-400 focus-visible:ring-offset-white/70";
  const baseCard =
    "relative group isolate rounded-lg border border-neutral-200 bg-white/80 backdrop-blur " +
    "[@supports(backdrop-filter:blur(0))]:bg-white/70 shadow-sm transition-[box-shadow,transform,background-color,border-color] " +
    "duration-200 flex flex-col min-h-0 overflow-hidden p-6";
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

  const name = mother?.preferredName ?? "No patient selected";
  const photo = mother?.photoUrl ?? "/patient-placeholder.jpg";
  const fmtSleep = (m?: number | null) =>
    typeof m === "number" ? `${Math.floor(m / 60)}h ${m % 60}m` : "—";
  const val = (x?: number | null, suffix = "") => (typeof x === "number" ? `${x}${suffix}` : "—");
  const bleeding = lastCheckIn?.bleeding ?? null;
  const feeding = lastCheckIn?.feeding ?? null;
  const updatedAt = lastWearable?.date ?? lastCheckIn?.date ?? null;

  // use selectedId for downstream links
  const qs = selectedId ? `?motherId=${selectedId}` : "";


  return (
    <main className="h-dvh relative isolate grid grid-rows-[auto_2fr_1fr] font-sans tracking-tight">
      {/* Pastel blue canvas + soft radial */}
      <div className="absolute inset-0 -z-20 bg-sky-200" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_50%_-10%,rgba(199,210,254,0.65),rgba(255,255,255,0.6)_35%,transparent_70%)]" />

      {/* ===== Provider Console (top bar) — recent patients rail ===== */}
      <section className="border">
        <div className="backdrop-blur-[1px] py-3 md:py-4 transition-colors bg-[rgba(147,51,234,0.26)] hover:bg-[rgba(147,51,234,0.40)]">
          <div className="flex items-center gap-6 px-3 md:px-4">{/* bigger gap from title */}
            <h2 className="shrink-0 text-base md:text-lg font-semibold text-neutral-50">
              Provider Console
            </h2>

            {/* Centered, scrollable patient chips with extra leading space */}
            <div className="min-w-0 flex-1">
              <div className="flex justify-center overflow-x-auto">
                <div className="ml-6 flex items-center gap-3 md:gap-4 w-max">
                  {chips.map((c) => {
                    const active = String(selectedId) === String(c.id);
                    return (
                      <Link
                        key={c.id}
                        href={`/provider?motherId=${c.id}`}
                        className={[
                          "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                          "transition-colors whitespace-nowrap",
                          "text-neutral-900",
                          active
                            ? "bg-sky-200 border-sky-500"   // <-- blue when selected
                            : "bg-white/80 border-white/60 hover:bg-white",
                          focusRing,
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className={["h-2.5 w-2.5 rounded-full ring-2", riskToColorClasses(c.color)].join(" ")}
                          title={c.color}
                        />
                        <span className="font-medium">{c.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <Link
                href="/"
                className="px-3 py-1.5 text-xs md:text-sm bg-black text-white border border-black md:hover:bg-neutral-800 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-200"
              >
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ===== Top row ===== */}
      <section className="border min-h-0 px-3 py-3">
        <div className="h-full grid grid-cols-3 max-md:grid-cols-1 gap-3">
          {/* Emotional Status */}
          <Link
            href={`/provider/emotional_status${qs}`}
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
            <p className="mt-3 text-sm text-neutral-800/90">Sentiment trends and PPD/PMAD risk flags.</p>
            <div className="mt-3 flex justify-center">
              <div className="relative w-[460px] max-w-full aspect-[16/9]">
                <Image
                  src="/emotion-graph.png"
                  alt="Sample emotional sentiment graph"
                  fill
                  sizes="(max-width:768px) 100vw, 460px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div className="mt-auto text-sm text-neutral-900">View insights →</div>
          </Link>

          {/* Patient Overview */}
          <Link
            href={`/provider/basic_info${qs}`}
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

            <div className="mt-4 flex justify-center">
              <div className="relative h-60 w-60 md:h-84 md:w-84 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <Image
                  src={photo}
                  alt={mother ? `${name} profile photo` : "Patient profile photo"}
                  fill
                  sizes="(max-width:768px) 7rem, 8rem"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <p className="mt-8 text-sm text-neutral-800/90 text-center">
              {mother ? `Snapshot for ${name}` : "Select a patient to see details."}
            </p>
            <p className="mt-2 text-xs text-neutral-700 text-center">Tap to open basic info & profile →</p>
          </Link>

          {/* Physical Status */}
          <Link
            href={`/provider/physical_status${qs}`}
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
            <p className="mt-3 text-sm text-neutral-800/90">Pain, bleeding, sleep, feeding, vitals.</p>

            <ul className="mt-3 space-y-1.5 text-sm text-neutral-900">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Resting HR:</span> {val(lastWearable?.restingHr, " bpm")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Sleep (last night):</span> {fmtSleep(lastWearable?.sleepMin ?? lastCheckIn?.sleepMin)}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Steps:</span> {val(lastWearable?.steps)}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">HRV:</span> {val(lastWearable?.hrvMs, " ms")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Pain:</span> {typeof lastCheckIn?.painScore === "number" ? lastCheckIn.painScore : "—"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Bleeding:</span> {bleeding ?? "—"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span><span className="font-medium">Feeding:</span> {feeding ?? "—"}</span>
              </li>
            </ul>

            <div className="mt-auto text-xs text-neutral-600">
              {updatedAt
                ? `Updated ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(updatedAt)}`
                : "No recent measurements"}
            </div>

            <div className="mt-1 text-sm text-neutral-900">Review metrics →</div>
          </Link>
        </div>
      </section>

      {/* ===== Bottom row unchanged ===== */}
      <section className="border min-h-0 px-3 pb-3">
        <div className="h-full grid grid-cols-2 max-md:grid-cols-1 gap-3">
          <Link
            href={`/provider/drafts${qs}`}
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
            href={`/provider/diary_summary${qs}`}
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
          <Link
          href={`/provider/chat${qs}`} // qs ensures selected motherId is passed
          aria-label="Open Chat with Mother"
          className={withHalo(
            "after:bg-pink-600/45",
            "group-hover:ring-pink-400/70",
            "hover:shadow-[0_18px_60px_-12px_rgba(219,39,119,0.55)]"
          )}
        >
          <div className="flex items-center gap-3">
            <HeartPulse className="h-7 w-7 text-neutral-900" aria-hidden />
            <h3 className="text-xl font-semibold text-neutral-900">Chat with Mother</h3>
          </div>
          <p className="mt-2 text-sm text-neutral-800/90">
            Open a messaging interface to communicate with the selected mother directly.
          </p>
          <div className="mt-auto w-full">
            <div className="mt-3 w-full border border-neutral-300/70 px-3 py-2 text-sm flex items-center justify-center bg-white/60 rounded">
              <span className="text-neutral-900">Start Chat →</span>
            </div>
          </div>
        </Link>

        </div>
      </section>
    </main>
  );
}
