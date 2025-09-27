import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Use the first mother for now
  const mother = await prisma.motherProfile.findFirst();
  if (!mother) return NextResponse.json({ drafts: [] });

  const drafts = await prisma.providerDraft.findMany({
    where: { ticket: { motherId: mother.id } },
    orderBy: { lastEditedAt: "desc" },
    select: { id: true, draftText: true },
  });

  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
  const { draftId, finalText } = await req.json();
  if (!draftId || !finalText)
    return NextResponse.json({ error: "Missing draftId or finalText" }, { status: 400 });

  // Update the ProviderDraft to finalize and also optionally create a ProviderReply
  const draft = await prisma.providerDraft.update({
    where: { id: draftId },
    data: { draftText: finalText },
  });

  // Insert into ProviderReply for the mother / ticket
  await prisma.providerReply.create({
    data: {
      ticketId: draft.ticketId,
      finalText,
      providerName: "Dr. Smith", // placeholder, could be dynamic
      ackByMother: false,
    },
  });

  return NextResponse.json({ success: true });
}
