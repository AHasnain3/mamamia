// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { Users, Smile } from "lucide-react";
import { prisma } from "@/lib/prisma"; // server-side
import MotherChooser from "./_components/MotherChooser"; // client component

export type MotherLite = { id: number; preferredName: string | null; photoUrl: string | null };

export default async function Home() {
  // Fetch all mothers for the chooser
  const mothers: MotherLite[] = await prisma.motherProfile.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, preferredName: true, photoUrl: true },
  });

  const firstRecent = mothers[0] ?? null;
  const providerHref = firstRecent ? `/provider?motherId=${firstRecent.id}` : "/provider";

  const cardBase =
    // NOTE: add "h-full block" so the card fills the grid cell height
    "block h-full rounded-2xl border p-8 text-center shadow-sm transition focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

  const hasMultipleMothers = mothers.length > 1;

  return (
    <main className="min-h-dvh relative isolate flex items-center justify-center p-8">
      {/* dark canvas */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      {/* brighter pink glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(2000px_1000px_at_50%_-25%,rgba(244,114,182,0.55),transparent_70%)]" />

      <div className="w-full max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-neutral-50">
            Hi! I&apos;m Mia <span aria-hidden>😊</span>
          </h1>
          <p className="mt-3 text-neutral-300">
            A mother-first companion with optional provider support.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Mother (brighter) */}
          {hasMultipleMothers ? (
            <MotherChooser mothers={mothers}>
              <div
                className={[
                  cardBase,
                  // brighter warm gradient
                  "cursor-pointer border-white/20 bg-gradient-to-br from-rose-500/45 via-orange-400/25 to-rose-500/25",
                  "hover:from-rose-500/60 hover:via-orange-400/35 hover:to-rose-500/40",
                  "hover:shadow-[0_16px_44px_-12px_rgba(255,160,170,0.45)]",
                ].join(" ")}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/40 border border-rose-300/40">
                  <Smile className="h-6 w-6 text-rose-100" aria-hidden />
                </div>
                <h2 className="text-2xl font-semibold text-neutral-50">I’m a Mother</h2>
                <p className="mt-2 text-sm text-neutral-200">Choose your profile</p>
              </div>
            </MotherChooser>
          ) : (
            <Link
              href={"/mother" + (firstRecent ? `?motherId=${firstRecent.id}` : "")}
              className={[
                // make Link block + full height to match
                cardBase,
                "border-white/20 bg-gradient-to-br from-rose-500/45 via-orange-400/25 to-rose-500/25",
                "hover:from-rose-500/60 hover:via-orange-400/35 hover:to-rose-500/40",
                "hover:shadow-[0_16px_44px_-12px_rgba(255,160,170,0.45)]",
              ].join(" ")}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/40 border border-rose-300/40">
                <Smile className="h-6 w-6 text-rose-100" aria-hidden />
              </div>
              <h2 className="text-2xl font-semibold text-neutral-50">I’m a Mother</h2>
              <p className="mt-2 text-sm text-neutral-200">Mood, sleep, and gentle guidance</p>
            </Link>
          )}

          {/* Provider (brighter) */}
          <Link
            href={providerHref}
            className={[
              // block + h-full for parity
              cardBase,
              "border-white/20 bg-gradient-to-br from-sky-500/40 via-indigo-500/22 to-sky-500/22",
              "hover:from-sky-500/55 hover:via-indigo-500/32 hover:to-sky-500/32",
              "hover:shadow-[0_16px_44px_-12px_rgba(147,197,253,0.45)]",
            ].join(" ")}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-400/35 border border-sky-300/40">
              <Users className="h-6 w-6 text-sky-100" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-50">I’m a Provider</h2>
            <p className="mt-2 text-sm text-neutral-200">
              Monitor patients, review questions &amp; approve replies
            </p>
            <p className="mt-4 text-xs text-neutral-300">
              {firstRecent ? "Opens with your most recent patient" : "Opens Provider Console"}
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
