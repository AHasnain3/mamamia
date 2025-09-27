export const runtime = "nodejs"; // Prisma & Intl need Node runtime

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { localDayToUTC } from "@/app/lib/time";
import { cedar } from "@/app/lib/cedar";

// TEMP auth: use first MotherProfile so you can test immediately
async function getCurrentMother() {
  const mom = await prisma.motherProfile.findFirst();
  return mom ?? null;
}

export async function GET(req) {
  const mother = await getCurrentMother();
  if (!mother) return NextResponse.json({ error: "No MotherProfile found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const tz = mother.tz || "America/New_York";
  const dateUTC = localDayToUTC(dateParam, tz);

  let prompts = await prisma.dailyPrompt.findUnique({
    where: { motherId_date: { motherId: mother.id, date: dateUTC } },
  });

  if (!prompts) {
    const recent = await prisma.diaryEntry.findMany({
      where: { motherId: mother.id },
      orderBy: { date: "desc" },
      take: 14,
      select: { redactedNotes: true },
    });

    const curated = await cedar.runPromptCurator({
      stage: mother.ppdStage,
      recentSummaries: recent.map(r => r.redactedNotes).filter(Boolean),
    });

    prompts = await prisma.dailyPrompt.create({
      data: { motherId: mother.id, date: dateUTC, prompts: curated },
    });
  }

  const entry = await prisma.diaryEntry.findUnique({
    where: { motherId_date: { motherId: mother.id, date: dateUTC } },
  });

  return NextResponse.json({ prompts: prompts.prompts, entry });
}

export async function POST(req) {
  const mother = await getCurrentMother();
  if (!mother) return NextResponse.json({ error: "No MotherProfile found" }, { status: 404 });

  const { date, freeText, responses } = await req.json();
  if (!date || typeof freeText !== "string") {
    return NextResponse.json({ error: "Missing date or freeText" }, { status: 400 });
  }

  const tz = mother.tz || "America/New_York";
  const dateUTC = localDayToUTC(date, tz);

  const entry = await prisma.diaryEntry.upsert({
    where: { motherId_date: { motherId: mother.id, date: dateUTC } },
    update: { freeText, responses },
    create: { motherId: mother.id, date: dateUTC, freeText, responses },
  });

  const triage = await cedar.runRiskTriage({
    stage: mother.ppdStage,
    freeText,
    responses,
  });

  const updated = await prisma.diaryEntry.update({
    where: { id: entry.id },
    data: { riskSignal: triage.signal, redactedNotes: triage.redactedSummary },
  });

  if (triage.signal === "YELLOW" || triage.signal === "RED") {
    await prisma.providerAlert.create({
      data: {
        motherId: mother.id,
        entryId: updated.id,
        signal: triage.signal,
        summary: triage.redactedSummary,
      },
    });
  }

  return NextResponse.json({
    entry: {
      id: updated.id,
      riskSignal: updated.riskSignal,
      redactedNotes: updated.redactedNotes,
    },
  });
}
