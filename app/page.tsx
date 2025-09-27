import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh relative isolate flex items-center justify-center p-8">
      {/* ambient glow + dark canvas */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="pointer-events-none absolute inset-0 -z-10
                      bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.18),transparent_60%)]" />

      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-neutral-50">Hi! I'm Mia 😊</h1>
          <p className="mt-3 text-neutral-300">
            A mother-first companion with optional provider support.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Mother (warm tint) */}
          <Link
            href="/mother"
            className="rounded-2xl border border-white/20 p-8 text-center shadow-sm transition
                       bg-gradient-to-br from-rose-900/10 via-orange-900/5 to-rose-900/5
                       hover:from-rose-900/20 hover:via-orange-900/10 hover:to-rose-900/10
                       hover:shadow-[0_10px_30px_-10px_rgba(255,186,150,0.25)]"
          >
            <h2 className="text-2xl font-semibold text-neutral-50">I’m a Mother</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Mood, sleep, and gentle guidance
            </p>
          </Link>

          {/* Provider (cool tint) */}
          <Link
            href="/provider"
            className="rounded-2xl border border-white/20 p-8 text-center shadow-sm transition
                       bg-gradient-to-br from-sky-900/10 via-indigo-900/5 to-sky-900/5
                       hover:from-sky-900/20 hover:via-indigo-900/10 hover:to-sky-900/10
                       hover:shadow-[0_10px_30px_-10px_rgba(147,197,253,0.25)]"
          >
            <h2 className="text-2xl font-semibold text-neutral-50">I’m a Provider</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Monitor patients, review questions & approve replies
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
