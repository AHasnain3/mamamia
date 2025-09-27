export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tickets = await prisma.relayTicket.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      mother: { select: { id: true, preferredName: true } },
      providerDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({ tickets });
}
