export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reuse the same mother selection logic
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
  // fallback: create a demo mother
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

export async function GET(req) {
  const mother = await getMother(req);
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const sessions = await prisma.chatSession.findMany({
    where: { motherId: mother.id },
    orderBy: [{ date: "desc" }, { seqInDay: "desc" }],
    take: limit,
    skip: offset,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, oversight: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ sessions });
}
