// app/api/mia/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDayToUTC } from "@/lib/time";
import { runMiaResponse } from "@/lib/cedar";
import { getSystemForMode } from "@/lib/miaSystem"; // ok if you have it; we guard its use below

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function loadMotherStrict(id) {
  return prisma.motherProfile.findUnique({
    where: { id },
    select: { id: true, tz: true, ppdStage: true, preferredName: true },
  });
}

async function getOrCreateSessionStrict({ motherId, tz, dateYMD, mode, newChat }) {
  const dateUTC = localDayToUTC(dateYMD, tz || "America/New_York");
  const desiredMode = String(mode || "GENERAL").toUpperCase();

  if (newChat) {
    const last = await prisma.chatSession.findFirst({
      where: { motherId, date: dateUTC },
      orderBy: { seqInDay: "desc" },
      select: { seqInDay: true },
    });
    const seq = (last?.seqInDay ?? 0) + 1;
    return prisma.chatSession.create({
      data: { motherId, date: dateUTC, seqInDay: seq, mode: desiredMode },
    });
  }

  let sess = await prisma.chatSession.findFirst({
    where: { motherId, date: dateUTC },
    orderBy: { seqInDay: "desc" },
  });

  if (!sess) {
    sess = await prisma.chatSession.create({
      data: { motherId, date: dateUTC, seqInDay: 1, mode: desiredMode },
    });
  }

  if (desiredMode !== sess.mode) {
    sess = await prisma.chatSession.update({ where: { id: sess.id }, data: { mode: desiredMode } });
  }
  return sess;
}

// --- GET: load current session + messages (for the day) ---
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const motherId = toInt(url.searchParams.get("motherId"));
    if (motherId === null) {
      return NextResponse.json({ error: "Missing or invalid motherId" }, { status: 400 });
    }

    const mother = await loadMotherStrict(motherId);
    if (!mother) return NextResponse.json({ error: "Mother not found" }, { status: 404 });

    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const sessionIdRaw = url.searchParams.get("sessionId");
    const mode = url.searchParams.get("mode") || undefined;

    let session;
    if (sessionIdRaw) {
      const sid = toInt(sessionIdRaw);
      if (sid === null) return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });

      session = await prisma.chatSession.findUnique({ where: { id: sid } });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      if (session.motherId !== mother.id) {
        return NextResponse.json({ error: "Session does not belong to mother" }, { status: 403 });
      }
      if (mode && mode !== session.mode) {
        session = await prisma.chatSession.update({ where: { id: session.id }, data: { mode: String(mode).toUpperCase() } });
      }
    } else {
      session = await getOrCreateSessionStrict({
        motherId: mother.id,
        tz: mother.tz,
        dateYMD: date,
        mode,
        newChat: false,
      });
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

// --- POST: send a message OR create a new chat (createOnly) ---
export async function POST(req) {
  try {
    const body = await req.json();

    const motherId = toInt(body.motherId);
    if (motherId === null) {
      return NextResponse.json({ error: "Missing or invalid motherId" }, { status: 400 });
    }

    const mother = await loadMotherStrict(motherId);
    if (!mother) return NextResponse.json({ error: "Mother not found" }, { status: 404 });

    const date = body.date || new Date().toISOString().slice(0, 10);
    const mode = String(body.mode || "GENERAL").toUpperCase();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const newChat = Boolean(body.newChat);
    const createOnly = Boolean(body.createOnly);
    const sessionId = toInt(body.sessionId);

    const { exercise, eating, sleep, mentalScore, babyContentScore, timeWithBabyMin } = body;

    // Create-only: make a new session, return it (no LLM)
    if (createOnly) {
      const session = await getOrCreateSessionStrict({
        motherId: mother.id,
        tz: mother.tz,
        dateYMD: date,
        mode,
        newChat: true,
      });
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ session, messages });
    }

    // Send message flow
    if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

    let session;
    if (newChat) {
      session = await getOrCreateSessionStrict({
        motherId: mother.id,
        tz: mother.tz,
        dateYMD: date,
        mode,
        newChat: true,
      });
    } else if (sessionId !== null) {
      session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      if (session.motherId !== mother.id) {
        return NextResponse.json({ error: "Session does not belong to mother" }, { status: 403 });
      }
      if (mode && mode !== session.mode) {
        session = await prisma.chatSession.update({ where: { id: session.id }, data: { mode } });
      }
    } else {
      session = await getOrCreateSessionStrict({
        motherId: mother.id,
        tz: mother.tz,
        dateYMD: date,
        mode,
        newChat: false,
      });
    }

    // Store mother's message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "MOTHER",
        content: text,
        oversight: "NONE",
        meta: { mode },
      },
    });

    // Optional mode-specific system prompt
    const system =
      typeof getSystemForMode === "function"
        ? getSystemForMode(mode, { exercise, eating, sleep, mentalScore, babyContentScore, timeWithBabyMin })
        : undefined;

    // Generate Mia reply
    const mia = await runMiaResponse({
      mode,
      stage: mother.ppdStage,
      motherName: mother.preferredName,
      userText: text,
      system,
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

      // hidden draft (audit)
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

      // visible placeholder
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
