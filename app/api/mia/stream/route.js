// app/api/mia/stream/route.js
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { localDayToUTC } from "@/lib/time";
import { triageMia, streamMiaText } from "@/lib/cedar";

/** Pick a mother (same approach as /api/mia) */
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

async function getOrCreateSession({ mother, dateYMD, mode, newChat }) {
  const dateUTC = localDayToUTC(dateYMD, mother.tz || "America/New_York");

  if (newChat) {
    const last = await prisma.chatSession.findFirst({
      where: { motherId: mother.id, date: dateUTC },
      orderBy: { seqInDay: "desc" },
      select: { seqInDay: true },
    });
    const seq = (last?.seqInDay ?? 0) + 1;
    return prisma.chatSession.create({
      data: { motherId: mother.id, date: dateUTC, seqInDay: seq, mode: (mode || "GENERAL").toUpperCase() },
    });
  }

  let sess = await prisma.chatSession.findFirst({
    where: { motherId: mother.id, date: dateUTC },
    orderBy: { seqInDay: "desc" },
  });

  if (!sess) {
    sess = await prisma.chatSession.create({
      data: { motherId: mother.id, date: dateUTC, seqInDay: 1, mode: (mode || "GENERAL").toUpperCase() },
    });
  }

  const desired = (mode || sess.mode).toUpperCase();
  if (desired !== sess.mode) {
    sess = await prisma.chatSession.update({ where: { id: sess.id }, data: { mode: desired } });
  }
  return sess;
}

/** mode-specific tone for streaming */
function systemForMode(mode, stage) {
  const common = [
    `You are Mia, a kind postpartum virtual assistant.`,
    `User stage: ${stage}. Mode: ${mode}.`,
    `Keep replies supportive, clear, 2–6 sentences.`,
    `This is general information, not medical advice.`,
    `If symptoms sound urgent/clinical, advise contacting the care team.`,
  ].join("\n");

  if (mode === "MOOD")
    return common + "\nEmphasize validating feelings, gentle self-reflection, and noticing patterns; be reassuring.";
  if (mode === "BONDING")
    return common + "\nEmphasize concrete, age-appropriate bonding ideas and positive reinforcement.";
  if (mode === "HEALTH")
    return common + "\nSound concerned and helpful; prioritize safety language and when to contact provider.";
  return common;
}

export async function POST(req) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        const body = await req.json();
        const date = body.date || new Date().toISOString().slice(0, 10);
        const mode = String(body.mode || "GENERAL").toUpperCase(); // GENERAL | MOOD | BONDING | HEALTH
        const text = String(body.text ?? "").trim();
        const newChat = Boolean(body.newChat);
        const createOnly = Boolean(body.createOnly);
        const sessionId = body.sessionId;
        const additionalContext = body.additionalContext || null;

        const mother = await getMother(req);

        // Ensure a session (or create a fresh one when requested)
        let session;
        if (sessionId) {
          session = await prisma.chatSession.findUnique({ where: { id: Number(sessionId) } });
          if (!session) {
            send({ type: "error", message: "Session not found" });
            controller.close();
            return;
          }
          if (mode && mode !== session.mode) {
            session = await prisma.chatSession.update({ where: { id: session.id }, data: { mode } });
          }
        } else {
          session = await getOrCreateSession({ mother, dateYMD: date, mode, newChat });
        }

        // If the caller only wanted a fresh session, return that and close.
        if (createOnly) {
          send({ type: "session", session });
          send({ type: "final", sessionId: session.id });
          controller.close();
          return;
        }

        // Save mother's message (so history is consistent with non-stream route)
        if (text) {
          await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: "MOTHER",
              content: text,
              oversight: "NONE",
              meta: { mode, additionalContext },
            },
          });
        }

        // Send session event immediately so UI can set sessionId
        send({ type: "session", session });

        // Quick triage (same as non-stream route)
        const triage = triageMia({ mode, userText: text });
        if (triage.escalate) {
          const ticket = await prisma.relayTicket.create({
            data: {
              motherId: mother.id,
              question: text,
              riskFlags: { riskSignal: triage.riskSignal || "YELLOW", reason: triage.reason || "provider review" },
              summarySnapshot: { mode, date },
              status: "PENDING",
            },
          });

          // Hidden draft + visible placeholder
          await prisma.providerDraft.create({
            data: {
              ticketId: ticket.id,
              draftText:
                "Thanks for sharing that. I’m going to route this to your provider to review before I send along guidance.",
              modelMeta: { model: process.env.OPENAI_MODEL || "gpt-4o-mini", temp: 0.2 },
            },
          });

          await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              role: "MIA",
              content: "Message awaiting provider approval.",
              oversight: "AWAITING_PROVIDER",
              relayTicketId: ticket.id,
              meta: { mode, display: "placeholder" },
            },
          });

          send({ type: "awaiting_provider", ticketId: ticket.id, sessionId: session.id });
          send({ type: "final", sessionId: session.id });
          controller.close();
          return;
        }

        // Build prompts and stream
        const systemPrompt = systemForMode(mode, mother.ppdStage || "UNDIAGNOSED");
        const userPrompt =
          [
            mother.preferredName ? `Mother name: ${mother.preferredName}` : null,
            `User text:\n${text}`,
            additionalContext ? `Additional Context JSON:\n${JSON.stringify(additionalContext, null, 2)}` : null,
          ]
            .filter(Boolean)
            .join("\n\n");

        let full = "";
        full = await streamMiaText({
          systemPrompt,
          userPrompt,
          onDelta: (tok) => {
            send({ type: "delta", text: tok });
          },
        });

        // Save Mia’s final reply
        const miaMsg = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "MIA",
            content: full || "I’m here with you. Could you share a bit more?",
            oversight: "NONE",
            meta: { mode, riskSignal: "GREEN" },
          },
        });

        send({ type: "final", sessionId: session.id, lastMessageId: miaMsg.id });
      } catch (err) {
        console.error("POST /api/mia/stream error:", err);
        // Always send a structured error down the stream so the client never sees a network failure.
        const msg =
          (err && (err.message || err.toString())) || "Unexpected server error";
        try {
          send({ type: "error", message: msg });
        } finally {
          // close even if sending the error fails
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
