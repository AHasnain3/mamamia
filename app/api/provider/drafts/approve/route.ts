// app/api/provider/drafts/approve/route.ts
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { TicketStatus, OversightStatus, MessageRole } from "@/app/generated/prisma";

function coalesce<T>(...vals: Array<T | null | undefined>): T | undefined {
  for (const v of vals) if (v !== null && v !== undefined) return v as T;
  return undefined;
}

async function safeJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await safeJson(req);

    // Accept ticketId OR draftId (body or query)
    const ticketId = Number(coalesce(body.ticketId, url.searchParams.get("ticketId")));
    const draftId  = Number(coalesce(body.draftId,  url.searchParams.get("draftId")));

    let ticket = null as Awaited<ReturnType<typeof prisma.relayTicket.findUnique>> | null;
    let draft  = null as Awaited<ReturnType<typeof prisma.providerDraft.findUnique>> | null;

    if (Number.isFinite(ticketId)) {
      ticket = await prisma.relayTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) return new Response(JSON.stringify({ error: "ticket not found" }), { status: 404 });
    } else if (Number.isFinite(draftId)) {
      draft = await prisma.providerDraft.findUnique({ where: { id: draftId } });
      if (!draft)  return new Response(JSON.stringify({ error: "draft not found" }),  { status: 404 });
      ticket = await prisma.relayTicket.findUnique({ where: { id: draft.ticketId } });
      if (!ticket) return new Response(JSON.stringify({ error: "ticket not found" }), { status: 404 });
    } else {
      return new Response(JSON.stringify({ error: "ticketId required" }), { status: 400 });
    }

    // If no explicit draft given, use latest for this ticket
    if (!draft) {
      draft = await prisma.providerDraft.findFirst({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "desc" },
      });
    }

    // Pull edited text from multiple possible keys; fall back to DB draft
    const editedFromRequest =
      coalesce<string>(
        body.draftText,
        body.text,
        body.finalText,
        body.message,
        url.searchParams.get("draftText"),
        url.searchParams.get("text"),
        url.searchParams.get("finalText"),
        url.searchParams.get("message"),
      ) ?? null;

    const finalText = String(editedFromRequest ?? draft?.draftText ?? "").trim();
    if (!finalText) {
      return new Response(JSON.stringify({ error: "no draft text" }), { status: 400 });
    }

    // If provider supplied an edit, persist it back to the draft record
    if (draft && editedFromRequest !== null && finalText !== (draft.draftText ?? "").trim()) {
      await prisma.providerDraft.update({
        where: { id: draft.id },
        data: { draftText: finalText, lastEditedAt: new Date() },
      });
    }

    // Replace ALL placeholders for this ticket (handles any duplicates)
    const placeholders = await prisma.chatMessage.findMany({
      where: { relayTicketId: ticket.id, oversight: OversightStatus.AWAITING_PROVIDER },
      orderBy: { createdAt: "asc" },
      select: { id: true, sessionId: true, meta: true },
    });

    let messageId: number | null = null;
    let sessionId: number | null = null;

    if (placeholders.length) {
      for (const ph of placeholders) {
        const updated = await prisma.chatMessage.update({
          where: { id: ph.id },
          data: {
            role: MessageRole.PROVIDER,
            content: finalText,
            oversight: OversightStatus.APPROVED,
            meta: { ...(ph.meta as any), approvedAt: new Date(), approvedTicketId: ticket.id },
          },
        });
        messageId = updated.id;                // last updated id
        sessionId = updated.sessionId as any;  // consistent session
      }
    } else {
      // No placeholder -> inject a new provider message
      const snap: any = ticket.summarySnapshot || {};
      sessionId =
        snap.sessionId ??
        (
          await prisma.chatSession.findFirst({
            where: { motherId: ticket.motherId },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          })
        )?.id ??
        null;

      if (!sessionId) {
        return new Response(JSON.stringify({ error: "no session to deliver message" }), { status: 409 });
      }

      const created = await prisma.chatMessage.create({
        data: {
          sessionId,
          role: MessageRole.PROVIDER,
          content: finalText,
          oversight: OversightStatus.APPROVED,
          relayTicketId: ticket.id,
          meta: { injectedFromTicket: ticket.id },
        },
      });
      messageId = created.id;
    }

    // Mark ticket answered and mark draft approved
    await prisma.relayTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.ANSWERED },
    });

    if (draft && !draft.approved) {
      await prisma.providerDraft.update({
        where: { id: draft.id },
        data: { approved: true, lastEditedAt: new Date() },
      });
    }

    // Audit
    await prisma.providerReply
      .create({
        data: {
          ticketId: ticket.id,
          finalText,
          providerName: "Provider",
        },
      })
      .catch(() => {});

    return new Response(JSON.stringify({ ok: true, messageId, sessionId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("approve error", e);
    return new Response(JSON.stringify({ error: e?.message || "server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
