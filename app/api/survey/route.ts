import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- use the singleton

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, date, motherId, sessionId } = body as {
      type: "MOOD" | "BONDING";
      date?: string;
      motherId?: number | null;
      sessionId?: number | null;
    };

    const dateIso = date ?? new Date().toISOString();

    if (type === "MOOD") {
      const {
        exercise, // "NONE"|"LIGHT"|"MODERATE"|"VIGOROUS"
        eating,   // "POOR"|"FAIR"|"GOOD"|"EXCELLENT"
        sleep,    // "POOR"|"FAIR"|"GOOD"|"EXCELLENT"
        mentalScore, // 1..10
      } = body;

      if (
        !exercise || !eating || !sleep ||
        typeof mentalScore !== "number" || mentalScore < 1 || mentalScore > 10
      ) {
        return NextResponse.json({ error: "Invalid MOOD payload" }, { status: 400 });
      }

      const saved = await prisma.moodWellbeingSurvey.create({
        data: {
          motherId: motherId ?? null,
          sessionId: sessionId ?? null,
          date: new Date(dateIso),
          exercise,
          eating,
          sleep,
          mentalScore,
        },
      });

      return NextResponse.json({ ok: true, surveyId: saved.id });
    }

    if (type === "BONDING") {
      const { babyContentScore, timeWithBabyMin } = body;
      if (
        typeof babyContentScore !== "number" || babyContentScore < 1 || babyContentScore > 10 ||
        typeof timeWithBabyMin !== "number" || timeWithBabyMin < 0
      ) {
        return NextResponse.json({ error: "Invalid BONDING payload" }, { status: 400 });
      }

      const saved = await prisma.bondingSurvey.create({
        data: {
          motherId: motherId ?? null,
          sessionId: sessionId ?? null,
          date: new Date(dateIso),
          babyContentScore,
          timeWithBabyMin,
        },
      });

      return NextResponse.json({ ok: true, surveyId: saved.id });
    }

    return NextResponse.json({ error: "Unknown survey type" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
