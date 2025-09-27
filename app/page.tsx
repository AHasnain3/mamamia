// app/page.tsx
import Link from "next/link";
import { Users, Smile } from "lucide-react";
import { prisma } from "@/lib/prisma"; // keep if you want deep-link to first patient

export default async function Home() {
  const firstRecent = await prisma.motherProfile.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  const providerHref = firstRecent ? `/provider?motherId=${firstRecent.id}` : "/provider";

  const cardBase =
    "rounded-2xl border p-8 text-center shadow-sm transition focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

  return (
    <main className="min-h-dvh relative isolate flex items-center justify-center p-8">
      {/* dark canvas */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      {/* brighter pink glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(2000px_1000px_at_50%_-25%,rgba(244,114,182,0.5),transparent_70%)]" />


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
          {/* Mother (warm tint) */}
          <Link
            href="/mother"
            className={[
              cardBase,
              "border-white/15 bg-gradient-to-br from-rose-900/25 via-orange-900/15 to-rose-900/15",
              "hover:from-rose-900/35 hover:via-orange-900/20 hover:to-rose-900/20",
              "hover:shadow-[0_14px_40px_-12px_rgba(255,186,150,0.3)]",
            ].join(" ")}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/20 border border-rose-300/30">
              <Smile className="h-6 w-6 text-rose-200" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-50">I’m a Mother</h2>
            <p className="mt-2 text-sm text-neutral-300">Mood, sleep, and gentle guidance</p>
          </Link>

          {/* Provider (cool tint) */}
          <Link
            href={providerHref}
            className={[
              cardBase,
              "border-white/15 bg-gradient-to-br from-sky-900/20 via-indigo-900/12 to-sky-900/12",
              "hover:from-sky-900/30 hover:via-indigo-900/18 hover:to-sky-900/18",
              "hover:shadow-[0_14px_40px_-12px_rgba(147,197,253,0.3)]",
            ].join(" ")}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-400/20 border border-sky-300/30">
              <Users className="h-6 w-6 text-sky-200" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold text-neutral-50">I’m a Provider</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Monitor patients, review questions &amp; approve replies
            </p>
            <p className="mt-4 text-xs text-neutral-400">
              {firstRecent ? "Opens with your most recent patient" : "Opens Provider Console"}
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
