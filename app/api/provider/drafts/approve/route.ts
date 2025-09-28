// app/api/provider/drafts/approve/route.ts
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
// Enums are generated to app/generated/prisma per your schema's `output`
import {
  TicketStatus,
  OversightStatus,
  MessageRole,
} from "@/app/generated/prisma";

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

    // Accept ticketId OR draftId from body OR querystring
    const ticketIdRaw =
      body.ticketId ?? url.searchParams.get("ticketId") ?? null;
    const draftIdRaw = body.draftId ?? url.searchParams.get("draftId") ?? null;

    const ticketId = ticketIdRaw ? Number(ticketIdRaw) : null;
    const draftId = draftIdRaw ? Number(draftIdRaw) : null;

    // Resolve the ticket from whichever id we got
    let ticket = null as Awaited<
      ReturnType<typeof prisma.relayTicket.findUnique>
    > | null;
    let draft = null as Awaited<
      ReturnType<typeof prisma.providerDraft.findUnique>
    > | null;

    if (ticketId) {
      ticket = await prisma.relayTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        return new Response(JSON.stringify({ error: "ticket not found" }), {
          status: 404,
        });
      }
    } else if (draftId) {
      draft = await prisma.providerDraft.findUnique({ where: { id: draftId } });
      if (!draft) {
        return new Response(JSON.stringify({ error: "draft not found" }), {
          status: 404,
        });
      }
      ticket = await prisma.relayTicket.findUnique({
        where: { id: draft.ticketId },
      });
      if (!ticket) {
        return new Response(JSON.stringify({ error: "ticket not found" }), {
          status: 404,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "ticketId required" }), {
        status: 400,
      });
    }

    // Determine the text to send: prefer explicit draftText, else latest draft for the ticket
    if (!draft) {
      draft = await prisma.providerDraft.findFirst({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: "desc" },
      });
    }
    const finalText = String(body.draftText ?? draft?.draftText ?? "").trim();
    if (!finalText) {
      return new Response(JSON.stringify({ error: "no draft text" }), {
        status: 400,
      });
    }

    // Try to replace the existing placeholder message
    const placeholder = await prisma.chatMessage.findFirst({
      where: {
        relayTicketId: ticket.id,
        oversight: OversightStatus.AWAITING_PROVIDER,
      },
      orderBy: { createdAt: "asc" },
    });

    let sessionId: number | null = null;
    let messageId: number;

    if (placeholder) {
      const updated = await prisma.chatMessage.update({
        where: { id: placeholder.id },
        data: {
          role: MessageRole.PROVIDER,
          content: finalText,
          oversight: OversightStatus.APPROVED,
          meta: {
            ...(placeholder.meta as any),
            approvedAt: new Date(),
            approvedTicketId: ticket.id,
          },
        },
      });
      messageId = updated.id;
      sessionId = updated.sessionId as unknown as number;
    } else {
      // Fallback to a session captured in the ticket snapshot or latest session for the mother
      const snap = (ticket.summarySnapshot as any) || {};
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
        return new Response(
          JSON.stringify({ error: "no session to deliver message" }),
          { status: 409 }
        );
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

    // Mark the ticket answered (uses your enum)
    await prisma.relayTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.ANSWERED },
    });

    // Mark the exact draft as approved if we know it
    if (draft && !draft.approved) {
      await prisma.providerDraft.update({
        where: { id: draft.id },
        data: { approved: true, lastEditedAt: new Date() },
      });
    }

    // Keep a row in ProviderReply for audit
    await prisma.providerReply
      .create({
        data: {
          ticketId: ticket.id,
          finalText,
          providerName: "Provider",
        },
      })
      .catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, messageId, sessionId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("approve error", e);
    return new Response(
      JSON.stringify({ error: e?.message || "server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
