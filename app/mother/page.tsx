import Link from "next/link";
import { MessageCircleQuestion, Info, NotebookPen, HeartPulse, History } from "lucide-react";

const tiles = [
  {
    href: "/mother/ask",
    title: "Ask a Question",
    desc: "Send a question (optionally relay to your provider).",
    Icon: MessageCircleQuestion,
  },
  {
    href: "/mother/basic_info",
    title: "Basic Info",
    desc: "Delivery details, preferences, contacts.",
    Icon: Info,
  },
  {
    href: "/mother/diary",
    title: "Diary",
    desc: "Daily notes, voice journaling, photos (optional).",
    Icon: NotebookPen,
  },
  {
    href: "/mother/mood_well_being",
    title: "Mood & Well-Being",
    desc: "Quick check-ins + gentle suggestions.",
    Icon: HeartPulse,
  },
  {
    href: "/mother/timeline",
    title: "Timeline",
    desc: "See your recent activity and trends.",
    Icon: History,
  },
];

export default function MotherPage() {
  return (
    <main className="min-h-dvh p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Mother Portal</h1>
          <p className="mt-2 text-muted-foreground">Choose where you want to go.</p>
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
