// app/api/provider/drafts/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { draftId, finalText } = await req.json();
    if (!draftId) {
      return NextResponse.json({ error: "draftId required" }, { status: 400 });
    }

    const draft = await prisma.providerDraft.findUnique({
      where: { id: Number(draftId) },
      include: { ticket: true },
    });
    if (!draft || !draft.ticketId) {
      return NextResponse.json({ error: "Draft or ticket not found" }, { status: 404 });
    }

    const text = (finalText ?? draft.draftText) as string;

    await prisma.providerDraft.update({
      where: { id: draft.id },
      data: {
        draftText: text,
        approved: true,
      },
    });

    await prisma.providerReply.create({
      data: {
        ticketId: draft.ticketId,
        finalText: text,
        providerName: "Dr. Smith", // TODO: wire your provider identity
        ackByMother: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to approve draft" }, { status: 500 });
  }
}
