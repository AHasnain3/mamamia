import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

/** POST /api/provider/drafts/hil
 * Body: { draftId: number, draftText: string }
 * Returns: { suggestedText: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { draftId, draftText } = await req.json();
    if (!draftId || typeof draftText !== "string") {
      return NextResponse.json(
        { error: "draftId and draftText are required" },
        { status: 400 }
      );
    }

    const system = `You revise provider replies to postpartum mothers.
Keep it empathetic, clinically safe, and concise (3–6 sentences).
Avoid diagnosis; encourage appropriate follow-up/escalation for red flags.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Please improve this provider draft without changing its intent:\n\n=== DRAFT ===\n${draftText}`,
        },
      ],
    });

    const suggestedText =
      completion.choices?.[0]?.message?.content?.trim() ?? draftText;

    return NextResponse.json({ suggestedText });
  } catch (e) {
    console.error("HIL suggest error:", e);
    return NextResponse.json({ error: "Failed to suggest text" }, { status: 500 });
  }
}
