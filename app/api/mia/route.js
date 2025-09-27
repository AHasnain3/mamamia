// app/api/mia/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDayToUTC } from "@/lib/time";
import { runMiaResponse } from "@/lib/cedar";

// Pick a mother (header/query/env fallback, else first, else create demo)
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

// --- GET: load current session + messages (for the day) ---
export async function GET(req) {
  try {
    const mother = await getMother(req);
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const sessionId = url.searchParams.get("sessionId");
    const mode = url.searchParams.get("mode") || undefined;

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({ where: { id: Number(sessionId) } });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    } else {
      session = await getOrCreateSession({ mother, dateYMD: date, mode, newChat: false });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ session, messages });
  } catch (err) {
    console.error("GET /api/mia error:", err);
    return NextResponse.json({ error: "failed to load session" }, { status: 500 });
  }
}

// --- POST: send a message (creates/loads session, saves messages, generates Mia reply) ---
export async function POST(req) {
  try {
    const mother = await getMother(req);
    const body = await req.json();
    const date = body.date || new Date().toISOString().slice(0, 10);
    const mode = String(body.mode || "GENERAL").toUpperCase(); // "GENERAL" | "MOOD" | "BONDING" | "HEALTH"
    const text = String(body.text ?? "").trim();
    const newChat = Boolean(body.newChat);
    const sessionId = body.sessionId;

    if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({ where: { id: Number(sessionId) } });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      if (mode && mode !== session.mode) {
        session = await prisma.chatSession.update({ where: { id: session.id }, data: { mode } });
      }
    } else {
      session = await getOrCreateSession({ mother, dateYMD: date, mode, newChat });
    }

    // Store the mother's message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "MOTHER",
        content: text,
        oversight: "NONE",
        meta: { mode },
      },
    });

    // Generate Mia reply
    const mia = await runMiaResponse({
      mode,
      stage: mother.ppdStage,
      motherName: mother.preferredName,
      userText: text,
    });

    if (mia.needsProviderReview) {
      const ticket = await prisma.relayTicket.create({
        data: {
          motherId: mother.id,
          question: text,
          riskFlags: { riskSignal: mia.riskSignal || "YELLOW", reason: mia.reason || "provider review requested" },
          summarySnapshot: { mode, date },
          status: "PENDING",
        },
      });

      await prisma.providerDraft.create({
        data: {
          ticketId: ticket.id,
          draftText: mia.reply,
          modelMeta: { model: process.env.OPENAI_MODEL || "gpt-4o-mini", temp: 0.2 },
        },
      });

      // hidden draft (for audit trail)
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "MIA",
          content: mia.reply,
          oversight: "AWAITING_PROVIDER",
        relayTicketId: ticket.id,
          meta: { mode, providerProposed: true, reason: mia.reason || "" },
        },
      });

      // visible placeholder (attach ticket id so provider approval can replace it)
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

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ session, messages, lastMessageId: placeholder.id });
    }

    // Normal reply
    const miaMsg = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "MIA",
        content: mia.reply,
        oversight: "NONE",
        meta: { mode, riskSignal: mia.riskSignal || "GREEN" },
      },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ session, messages, lastMessageId: miaMsg.id });
  } catch (err) {
    console.error("POST /api/mia error:", err);
    return NextResponse.json({ error: "failed to send message" }, { status: 500 });
  }
}
