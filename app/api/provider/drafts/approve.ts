// app/api/provider/drafts/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { draftId, finalText } = await req.json();
    if (!draftId || !finalText) {
      return NextResponse.json({ error: "Missing draftId or finalText" }, { status: 400 });
    }

    // Update the draft in the database to mark it approved
    await prisma.providerDraft.update({
      where: { id: draftId },
      data: {
        draftText: finalText,
        approved: true, // assuming you have an 'approved' boolean field
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error approving draft:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
