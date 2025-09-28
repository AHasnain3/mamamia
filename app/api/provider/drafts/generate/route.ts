import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";

// Optional: use SDK if you installed it. Otherwise comment this block and use the fetch() version below.
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackDraft(motherName = "there") {
  return `Hi ${motherName}, thanks for sharing how you’re feeling. 
It’s very common to have increased worry and sleep changes after delivery. 
Try gentle sleep routines, hydration, and short moments of rest when possible. 
If you notice thoughts of harming yourself or your baby, new chest pain, heavy bleeding, fever, or worsening mood, please seek urgent care or call emergency services. 
I’m here with you—would it be ok if we scheduled a quick check-in to talk through this more?`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      ticketId?: number;
      motherName?: string;
      lastMessage?: string;
      model?: string;
    };

    // 0) Ensure a RelayTicket exists (seed minimal data in empty DBs)
    let ticketId = body.ticketId ?? null;

    if (ticketId == null) {
      const latest = await prisma.relayTicket.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (latest) {
        ticketId = latest.id;
      } else {
        // Ensure there is at least one mother
        const mother =
          (await prisma.motherProfile.findFirst({ select: { id: true } })) ??
          (await prisma.motherProfile.create({
            data: {
              preferredName: "Demo Mom",
              deliveryType: "VAGINAL",
              deliveryDate: new Date(),
              contactMethods: {} as Prisma.InputJsonValue,
              tz: "America/Los_Angeles",
            },
            select: { id: true },
          }));

        const createdTicket = await prisma.relayTicket.create({
          data: {
            motherId: mother.id,
            question:
              body.lastMessage ??
              "I’ve been feeling anxious in the evenings and having trouble sleeping since delivery.",
            riskFlags: {} as Prisma.InputJsonValue,
            summarySnapshot: {} as Prisma.InputJsonValue,
          },
          select: { id: true },
        });

        ticketId = createdTicket.id;
      }
    }

    // 1) Try OpenAI; if anything goes wrong, fall back to a safe draft
    const model = body.model || "gpt-4o-mini";
    const motherName = body.motherName || "there";
    const lastMessage =
      body.lastMessage ||
      "I’ve been feeling anxious in the evenings and having trouble sleeping since delivery.";

    let suggestedText = fallbackDraft(motherName);
    let usedSource: "openai" | "fallback" = "fallback";

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY");
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const system = `You are a clinician assistant drafting short, empathetic replies to postpartum mothers.
Keep the reply safe, supportive, and practical (3–6 sentences).
Do not diagnose. Encourage appropriate follow-up and escalation for red flags.`;

      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              `Mother's preferred name (if known): ${motherName}`,
              "",
              "Mother's latest message:",
              lastMessage,
              "",
              "Draft a concise provider reply.",
            ].join("\n"),
          },
        ],
      });

      const ai = completion.choices?.[0]?.message?.content?.trim();
      if (ai) {
        suggestedText = ai;
        usedSource = "openai";
      }
    } catch (aiErr) {
      console.error("OpenAI generation failed, using fallback draft:", aiErr);
      // continue with fallback
    }

    // 2) Create the draft row
    const created = await prisma.providerDraft.create({
      data: {
        ticketId: Number(ticketId),
        draftText: suggestedText,
        approved: false,
        modelMeta: {
          source: usedSource,
          model,
          createdVia: "generate",
          createdAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
      select: { id: true, ticketId: true, draftText: true, approved: true },
    });

    return NextResponse.json({ draft: created }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/provider/drafts/generate error:", e?.message ?? e);
    return NextResponse.json(
      {
        error: "Failed to generate provider draft",
        detail: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
