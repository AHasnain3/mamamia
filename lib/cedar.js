// lib/cedar.js
// Server wrapper that produces structured replies for Mia.
// Uses OpenAI Chat Completions with JSON Schema to keep outputs predictable.

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Very lightweight JSON parse guard
function safeJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Optional: hard heuristics to *force* provider oversight in HEALTH mode
const PROVIDER_HARD_TRIGGERS = [
  // maternal red flags
  "suicide", "kill myself", "hurt myself", "end it", "psychosis",
  "hearing voices", "seeing things",
  "severe headache", "vision changes", "bp ", "blood pressure",
  "shortness of breath", "chest pain",
  "calf pain", "leg swelling", "dvt", "pulmonary embolism",
  "heavy bleeding", "soaked pad", "large clots",
  "fever", "103", "102", "101", "100.4", "chills",
  "incision red", "incision pus", "wound opening", "infection",
  "severe abdominal pain", "right upper quadrant pain",
  "postpartum preeclampsia", "postpartum hemorrhage",
  // infant red flags
  "blue lips", "floppy", "lethargic baby", "no wet diapers",
  "fever baby", "high fever baby", "trouble breathing",
  // meds / diagnosis specifics
  "dose", "dosage", "prescribed", "antibiotic", "antidepressant",
  "sertraline", "zoloft", "ssri", "ibuprofen", "acetaminophen",
  "breastfeeding and medication", "drug interaction",
];

// Core JSON-structured OpenAI call
async function callLLMStructured({ systemPrompt, userPrompt, jsonSchema }) {
  if (!OPENAI_API_KEY) {
    return { object: { reply: "Mia is offline (no API key set).", needsProviderReview: false } };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: { name: "out", schema: jsonSchema, strict: true },
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  return { object: safeJSON(content) };
}

/**
 * Produce a Mia reply with structured output and provider routing.
 * @param {{ mode: "GENERAL"|"MOOD"|"BONDING"|"HEALTH", stage: string, motherName?: string, userText: string, extraContext?: any }} args
 * @returns {Promise<{reply: string, needsProviderReview: boolean, reason?: string, riskSignal?: "GREEN"|"YELLOW"|"RED"}>}
 */
export async function runMiaResponse({ mode, stage, motherName, userText, extraContext }) {
  const modeName =
    mode === "MOOD" ? "Mood & Well-Being"
    : mode === "BONDING" ? "Bonding & Baby Care"
    : mode === "HEALTH" ? "Health Advice"
    : "General Support";

  // Hard overrides (safety & clinical escalations)
  const lower = (userText || "").toLowerCase();
  if (/\b(suicide|kill myself|hurt myself|end it)\b/.test(lower)) {
    return {
      reply:
        "I’m concerned about your safety. I’m going to alert your care team now. " +
        "If you’re in immediate danger, please call your local emergency number.",
      needsProviderReview: true,
      reason: "Self-harm language detected",
      riskSignal: "RED",
    };
  }
  if (mode === "HEALTH" && PROVIDER_HARD_TRIGGERS.some(k => lower.includes(k))) {
    // We *still* ask the model for a helpful draft, but we mark it for review
    const draft = await llmDraft({ modeName, stage, motherName, userText, extraContext, forceShort: true });
    return {
      reply: draft || "I’ll route this to your provider to review.",
      needsProviderReview: true,
      reason: "Potential clinical topic/urgent symptom requires provider oversight",
      riskSignal: "YELLOW",
    };
  }

  // Normal path: let the LLM decide if provider review is needed
  const systemPrompt = `
You are Mia, a kind postpartum virtual assistant.
User stage: ${stage}. Mode: ${modeName}.
Guidelines:
- Be supportive, clear, and concise.
- It's okay to discuss personal details (PHI allowed for this system).
- In HEALTH mode, if the topic involves diagnosis, prescriptions, concerning/worsening symptoms, or anything requiring clinical judgment, set needsProviderReview=true and include a brief 'reason'.
- Otherwise, give practical, common-sense guidance based on standard postpartum & newborn care. Include a light disclaimer like "This is general information."
- Keep answers ~2–6 sentences unless user asks for more.
Return JSON that matches the schema exactly.
`;

  const userPrompt = [
    motherName ? `Mother name: ${motherName}` : null,
    `User text:\n${userText}`,
    extraContext ? `Additional Context JSON:\n${JSON.stringify(extraContext, null, 2)}` : null,
  ].filter(Boolean).join("\n\n");

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["reply", "needsProviderReview"],
    properties: {
      reply: { type: "string", minLength: 1, maxLength: 3000 },
      needsProviderReview: { type: "boolean" },
      reason: { type: "string" },
      riskSignal: { type: "string", enum: ["GREEN", "YELLOW", "RED"] },
    },
  };

  const { object } = await callLLMStructured({ systemPrompt, userPrompt, jsonSchema: schema });
  if (!object?.reply) {
    return { reply: "I’m here with you. Could you share a bit more?", needsProviderReview: false };
  }
  return object;
}

// Helper to get a short LLM draft when we already know we’ll escalate
async function llmDraft({ modeName, stage, motherName, userText, extraContext, forceShort }) {
  const sys = `
You are Mia, drafting a SHORT helpful reply (2–4 sentences) for a provider to review before sending to the mother.
Mode: ${modeName}. Stage: ${stage}.
Return ONLY plain text.
`;
  const user = [
    motherName ? `Mother name: ${motherName}` : null,
    `User text:\n${userText}`,
    extraContext ? `Additional Context JSON:\n${JSON.stringify(extraContext, null, 2)}` : null,
    forceShort ? "Keep it brief and actionable." : null,
  ].filter(Boolean).join("\n\n");

  if (!OPENAI_API_KEY) return "Draft pending provider review.";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim();
}
