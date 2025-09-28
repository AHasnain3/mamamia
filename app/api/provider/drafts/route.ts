import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.providerDraft.findMany({
    orderBy: { createdAt: "desc" }, // newest first
    include: {
      ticket: {
        select: {
          motherId: true,
          mother: { select: { preferredName: true } },
        },
      },
    },
  });

  const drafts = rows.map((d) => ({
    id: d.id,
    ticketId: d.ticketId,
    draftText: d.draftText,
    approved: d.approved,
    createdAt: d.createdAt.toISOString(),
    motherId: d.ticket?.motherId ?? null,
    motherName: d.ticket?.mother?.preferredName ?? null,
  }));

  return NextResponse.json({ drafts });
}
