// lib/miaSystem.ts
export type ChatMode = "GENERAL" | "MOOD" | "BONDING" | "HEALTH";

type SurveyContext = {
  // optional — pass in when you have them
  exercise?: "NONE" | "LIGHT" | "MODERATE" | "VIGOROUS";
  eating?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  sleep?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  mentalScore?: number;           // 1..10
  babyContentScore?: number;      // 1..10
  timeWithBabyMin?: number;       // minutes
};

export function getSystemForMode(mode: ChatMode, ctx?: SurveyContext) {
  const shared =
    `You are "Mia", a warm, non-judgmental postpartum companion. ` +
    `Always be concise, specific, and kind. Offer practical steps and reassure without minimizing.`

  const mood =
    `Primary goal: help the user **understand themselves and their current state**.\n` +
    `Style: reflective, validating, and gently inquisitive. Offer small, doable suggestions.\n` +
    `Emphasize self-awareness (feelings, triggers, patterns), self-compassion, and safety resources when needed.`

  const bonding =
    `Primary goal: **guide and suggest ways to nurture the relationship with the baby**.\n` +
    `Style: encouraging coach. Offer concrete, developmentally-appropriate ideas (e.g., skin-to-skin, responsive routines, reading cues, soothing patterns).\n` +
    `Normalize variability, celebrate small wins, and propose 1–2 next steps.`

  const health =
    `Primary goal: **show concern and maintain a helpful, supportive tone** while addressing questions.\n` +
    `Style: clear, calm, and pragmatic. When uncertain or clinical, explain limits, suggest monitoring steps, and advise contacting the provider when appropriate.`

  const ctxLine = ctx ? renderContext(mode, ctx) : "";

  switch (mode) {
    case "MOOD":
      return `${shared}\n\n${mood}${ctxLine}`;
    case "BONDING":
      return `${shared}\n\n${bonding}${ctxLine}`;
    case "HEALTH":
      return `${shared}\n\n${health}${ctxLine}`;
    default:
      return `${shared}\n\nAct as a general postpartum companion with balanced support.${ctxLine}`;
  }
}

function renderContext(mode: ChatMode, c: SurveyContext) {
  // This is optional. If you saved survey responses, you can pass them
  // in to gently prime Mia’s first reply.
  const lines: string[] = [];
  if (mode === "MOOD") {
    if (c.exercise) lines.push(`Exercise: ${c.exercise}`);
    if (c.eating) lines.push(`Eating: ${c.eating}`);
    if (c.sleep) lines.push(`Sleep: ${c.sleep}`);
    if (typeof c.mentalScore === "number") lines.push(`Mental well-being: ${c.mentalScore}/10`);
  }
  if (mode === "BONDING") {
    if (typeof c.babyContentScore === "number") lines.push(`Baby contentness: ${c.babyContentScore}/10`);
    if (typeof c.timeWithBabyMin === "number") lines.push(`Time with baby: ${c.timeWithBabyMin} min`);
  }
  if (!lines.length) return "";
  return `\n\nContext for first reply:\n- ${lines.join("\n- ")}`;
}
