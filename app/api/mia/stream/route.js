// app/api/mia/stream/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDayToUTC } from "@/lib/time";
import { triageMia, streamMiaText, runMiaResponse } from "@/lib/cedar";

// ---- Mother selection (same logic as /api/mia) ----
async function getMother(req) {
  const url = new URL(req.url);
  const idParam = url.searchParams.get("motherId") || req.headers.get("x-mother-id");
  const envId = process.env.DEMO_MOTHER_ID ? parseInt(process.env.DEMO_MOTHER_ID, 10) : undefined;
  const id = Number.isFinite(Number(idParam)) ? Number(idParam) : envId;
  if (id) {
    const found = await prisma.motherProfile.findUnique({ where: { id } });
    if (found) return found;
  }
  const first = await prisma.motherProfile.findFirst();
  if (first) return first;
  return prisma.motherProfile.create({
    data: {
      preferredName: "Demo Mom",
      deliveryType: "VAGINAL",
      deliveryDate: new Date(),
      contactMethods: { email: "demo@example.com" },
      tz: "America/New_York",
      ppdStage: "UNDIAGNOSED",
    },
  });
}

async function getOrCreateSession({ mother, dateYMD, mode, newChat, sessionId }) {
  if (sessionId) {
    const s = await prisma.chatSession.findUnique({ where: { id: Number(sessionId) } });
    if (s) {
      if (mode && s.mode !== mode) {
        return prisma.chatSession.update({ where: { id: s.id }, data: { mode } });
      }
      return s;
    }
  }
  const dateUTC = localDayToUTC(dateYMD, mother.tz || "America/New_York");
  if (newChat) {
    const last = await prisma.chatSession.findFirst({
      where: { motherId: mother.id, date: dateUTC },
      orderBy: { seqInDay: "desc" },
      select: { seqInDay: true },
    });
    const seq = (last?.seqInDay ?? 0) + 1;
    return prisma.chatSession.create({
      data: { motherId: mother.id, date: dateUTC, seqInDay: seq, mode: mode || "GENERAL" },
    });
  }
  let sess = await prisma.chatSession.findFirst({
    where: { motherId: mother.id, date: dateUTC },
    orderBy: { seqInDay: "desc" },
  });
  if (!sess) {
    sess = await prisma.chatSession.create({
      data: { motherId: mother.id, date: dateUTC, seqInDay: 1, mode: mode || "GENERAL" },
    });
  }
  if (mode && mode !== sess.mode) {
    sess = await prisma.chatSession.update({ where: { id: sess.id }, data: { mode } });
  }
  return sess;
}

export async function POST(req) {
  const encoder = new TextEncoder();
  const mother = await getMother(req);
  const body = await req.json().catch(() => ({}));

  const date = body.date || new Date().toISOString().slice(0, 10);
  const mode = body.mode || "GENERAL"; // "GENERAL" | "MOOD" | "BONDING" | "HEALTH"
  const text = String(body.text ?? "").trim();
  const newChat = Boolean(body.newChat);
  const sessionId = body.sessionId;
  const clientAdditional = body.additionalContext || null; // from client

  if (!text) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }

  const stream = new ReadableStream({
    start: async (controller) => {
      const push = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        // Ensure session
        const session = await getOrCreateSession({ mother, dateYMD: date, mode, newChat, sessionId });
        push({ type: "session", session });

        // Persist mother's message immediately
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "MOTHER",
            content: text,
            oversight: "NONE",
            meta: { mode },
          },
        });

        // Server-side recent context (last 12 messages) + merge with client context
        const dbRecentRaw = await prisma.chatMessage.findMany({
          where: { sessionId: session.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { role: true, content: true, oversight: true, createdAt: true },
        });
        const dbRecent = dbRecentRaw.reverse().map((m) => ({
          role: m.role,
          content: m.content.slice(0, 1000),
          oversight: m.oversight,
          at: m.createdAt,
        }));
        const serverAdditional = {
          chat: {
            date,
            mode,
            sessionId: session.id,
            recent: dbRecent,
          },
        };
        const additionalContext = clientAdditional
          ? { ...serverAdditional, ...clientAdditional }
          : serverAdditional;

        // Quick triage to decide streaming vs provider review
        const triage = await triageMia({
          mode,
          stage: mother.ppdStage,
          motherName: mother.preferredName,
          userText: text,
          additionalContext,
        });

        if (triage.needsProviderReview) {
          // Create ticket
          const ticket = await prisma.relayTicket.create({
            data: {
              motherId: mother.id,
              question: text,
              riskFlags: {
                riskSignal: triage.riskSignal || "YELLOW",
                reason: triage.reason || "provider review requested",
              },
              summarySnapshot: { mode, date, additionalContext }, // keep context for provider
              status: "PENDING",
            },
          });

          // Generate a concise non-streaming provider draft (use structured helper)
          let draft = "Draft prepared for provider review.";
          try {
            const r = await runMiaResponse({
              mode,
              stage: mother.ppdStage,
              motherName: mother.preferredName,
              userText: text,
              extraContext: additionalContext, // runMiaResponse expects `extraContext`
            });
            if (r?.reply) draft = r.reply;
          } catch {
            // safe fallback already set
          }

          await prisma.providerDraft.create({
            data: {
              ticketId: ticket.id,
              draftText: draft,
              modelMeta: { model: process.env.OPENAI_MODEL || "gpt-4o-mini", temp: 0.2 },
            },
          });

          // Hidden draft message (audit)
          await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: "MIA",
              content: draft,
              oversight: "AWAITING_PROVIDER",
              relayTicketId: ticket.id,
              meta: { mode, providerProposed: true, reason: triage.reason || "" },
            },
          });

          // Visible placeholder to mother
          const placeholder = await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: "MIA",
              content: "Message awaiting provider approval.",
              oversight: "AWAITING_PROVIDER",
              relayTicketId: ticket.id,
              meta: { mode, display: "placeholder" },
            },
          });

          push({ type: "awaiting_provider", ticketId: ticket.id, placeholderId: placeholder.id });
          push({ type: "done" });
          controller.close();
          return;
        }

        // Stream assistant reply (safe path)
        push({ type: "start" });
        let full = "";
        for await (const token of streamMiaText({
          mode,
          stage: mother.ppdStage,
          motherName: mother.preferredName,
          userText: text,
          additionalContext, // stream helper expects `additionalContext`
        })) {
          full += token;
          push({ type: "delta", text: token });
        }

        // Persist final assistant message
        const saved = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "MIA",
            content: full,
            oversight: "NONE",
            meta: { mode, riskSignal: triage.riskSignal || "GREEN" },
          },
        });

        push({ type: "final", messageId: saved.id, sessionId: session.id });
        push({ type: "done" });
        controller.close();
      } catch (err) {
        push({ type: "error", message: err?.message || String(err) });
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
