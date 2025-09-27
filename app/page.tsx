import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold">Postpartum Copilot</h1>
          <p className="mt-3 text-muted-foreground">
            A mother-first companion with optional provider support.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/mother"
            className="rounded-2xl border p-8 text-center shadow-sm hover:shadow transition"
          >
            <h2 className="text-2xl font-semibold">I’m a Mother</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Mood, sleep, and gentle guidance
            </p>
          </Link>

          <Link
            href="/provider"
            className="rounded-2xl border p-8 text-center shadow-sm hover:shadow transition"
          >
            <h2 className="text-2xl font-semibold">I’m a Provider</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review questions & approve replies
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
