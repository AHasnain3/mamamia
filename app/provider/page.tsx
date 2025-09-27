import Link from "next/link";
import { FileText, NotebookText, Smile, Activity } from "lucide-react";

const tiles = [
  {
    href: "/provider/basic_info",
    title: "Basic Info",
    desc: "Delivery details, contacts, and consent.",
    Icon: FileText,
  },
  {
    href: "/provider/diary_summary",
    title: "Diary Summary",
    desc: "Recent notes and key highlights.",
    Icon: NotebookText,
  },
  {
    href: "/provider/emotional_status",
    title: "Emotional Status",
    desc: "Mood trends and risk flags (PPD/Anxiety heuristics).",
    Icon: Smile,
  },
  {
    href: "/provider/physical_status",
    title: "Physical Status",
    desc: "Pain, bleeding, sleep & other recovery markers.",
    Icon: Activity,
  },
];

export default function ProviderPage() {
  return (
    <main className="min-h-dvh p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Provider Console</h1>
          <p className="mt-2 text-muted-foreground">Quick access to mother summaries and status.</p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2">
          {tiles.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={title}
              className="rounded-2xl border p-6 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2 flex flex-col items-center text-center"
            >
              <Icon className="h-8 w-8 mb-3" aria-hidden="true" />
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </section>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-block rounded-lg border px-4 py-2 text-sm hover:bg-accent transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
