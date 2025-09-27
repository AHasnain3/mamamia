export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const ticketId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const providerName = body.providerName || "On-call Provider";
  const modifiedText = (body.modifiedText || "").trim();

  const ticket = await prisma.relayTicket.findUnique({
    where: { id: ticketId },
    include: { providerDrafts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!ticket) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  // find MIA messages tied to this ticket
  const hiddenDraft = await prisma.chatMessage.findFirst({
    where: { relayTicketId: ticket.id, oversight: "AWAITING_PROVIDER", meta: { path: ["providerProposed"], equals: true } },
  });
  const placeholder = await prisma.chatMessage.findFirst({
    where: { relayTicketId: ticket.id, oversight: "AWAITING_PROVIDER", meta: { path: ["display"], equals: "placeholder" } },
  });

  const draftText =
    modifiedText ||
    ticket.providerDrafts?.[0]?.draftText ||
    hiddenDraft?.content ||
    "Thanks for reaching out — your provider approved this message.";

  // provider reply record
  await prisma.providerReply.create({
    data: { ticketId: ticket.id, finalText: draftText, providerName },
  });

  // ticket answered
  await prisma.relayTicket.update({
    where: { id: ticket.id },
    data: { status: "ANSWERED" },
  });

  let sessionId;
  if (placeholder) {
    const updated = await prisma.chatMessage.update({
      where: { id: placeholder.id },
      data: {
        content: draftText,
        oversight: "APPROVED",
        meta: { ...(placeholder.meta || {}), providerName, approvedAt: new Date().toISOString() },
      },
    });
    sessionId = updated.sessionId;
  } else if (hiddenDraft) {
    const created = await prisma.chatMessage.create({
      data: {
        sessionId: hiddenDraft.sessionId,
        role: "MIA",
        content: draftText,
        oversight: "APPROVED",
        relayTicketId: ticket.id,
        meta: { providerName, approvedAt: new Date().toISOString() },
      },
    });
    sessionId = created.sessionId;
  }

  const messages = sessionId
    ? await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } })
    : [];

  return NextResponse.json({ ok: true, ticketId: ticket.id, messages });
}
