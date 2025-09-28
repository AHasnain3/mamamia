// app/api/provider/drafts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Fetch drafts for the first mother (ordered by createdAt)
    const drafts = await prisma.providerDraft.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        draftText: true,
      },
    });

    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("Error fetching drafts:", err);
    return NextResponse.json({ drafts: [] });
  }
}
