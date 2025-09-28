// app/api/provider/drafts/hil/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { draftId, draftText } = await req.json();

    if (!draftText) {
      return NextResponse.json({ error: "No draft text provided" }, { status: 400 });
    }

    // === Call OpenAI to generate a suggestion ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful medical assistant that rewrites provider draft text clearly and professionally." },
        { role: "user", content: draftText },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const suggestedText = completion.choices[0]?.message?.content ?? draftText;

    return NextResponse.json({ suggestedText });
  } catch (err) {
    console.error("OpenAI suggestion error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
