// lib/cedar.js
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (process.env.NODE_ENV !== "production") {
  const mask = (s) => (s ? s.slice(0, 6) + "…" : "missing");
  console.log("[Mia] OPENAI key:", mask(OPENAI_API_KEY));
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

// Hard clinical triggers that should go to provider review in HEALTH mode
const PROVIDER_HARD_TRIGGERS = [
  // maternal red flags
  "suicide","kill myself","hurt myself","end it","psychosis","hearing voices","seeing things",
  "severe headache","vision changes","blood pressure","shortness of breath","chest pain",
  "calf pain","leg swelling","dvt","pulmonary embolism",
  "heavy bleeding","soaked pad","large clots",
  "fever","103","102","101","100.4","chills",
  "incision red","incision pus","wound opening","infection",
  "severe abdominal pain","right upper quadrant pain","postpartum preeclampsia","postpartum hemorrhage",
  // infant red flags
  "blue lips","floppy","lethargic baby","no wet diapers","trouble breathing","fever baby",
  // meds / diagnosis specifics
  "dose","dosage","prescribed","antibiotic","antidepressant","sertraline","zoloft","ssri",
  "ibuprofen","acetaminophen","breastfeeding and medication","drug interaction"
];

// Simple JSON-object structured call (broadly supported)
async function callLLMStructured({ systemPrompt, userPrompt }) {
  if (!OPENAI_API_KEY) {
    return { object: { reply: "Mia is offline (no API key set).", needsProviderReview: false } };
  }

  const MUST_JSON = `
Return ONLY valid JSON with this exact shape:
{
  "reply": string,                // 1-3000 chars
  "needsProviderReview": boolean, // true if provider should approve first
  "reason": string | undefined,   // short reason if review=true
  "riskSignal": "GREEN"|"YELLOW"|"RED" | undefined
}
No extra keys. No markdown. No prose outside JSON.
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt + "\n\n" + MUST_JSON },
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI error:", res.status, errText);
    return { object: { reply: "Mia had trouble reaching the model. Please try again.", needsProviderReview: false } };
  }

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

  // Immediate RED for self-harm language
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

  // Hard triggers in HEALTH mode → provider review (but still draft a short reply)
  if (mode === "HEALTH" && PROVIDER_HARD_TRIGGERS.some(k => lower.includes(k))) {
    const draft = await llmDraft({ modeName, stage, motherName, userText, extraContext, forceShort: true });
    return {
      reply: draft || "I’ll route this to your provider to review.",
      needsProviderReview: true,
      reason: "Potential clinical topic/urgent symptom requires provider oversight",
      riskSignal: "YELLOW",
    };
  }

  const systemPrompt = `
You are Mia, a kind postpartum virtual assistant.
User stage: ${stage}. Mode: ${modeName}.
Guidelines:
- Be supportive, clear, and concise (2–6 sentences).
- PHI is allowed in this system.
- In HEALTH mode, if the topic involves diagnosis, prescriptions, concerning/worsening symptoms, or anything requiring clinical judgment, set needsProviderReview=true and include a brief 'reason'.
- Otherwise, give practical, common-sense guidance based on standard postpartum & newborn care. Add a light disclaimer like "This is general information."
Return only JSON as specified.
`.trim();

  const userPrompt = [
    motherName ? `Mother name: ${motherName}` : null,
    `User text:\n${userText}`,
    extraContext ? `Additional Context JSON:\n${JSON.stringify(extraContext, null, 2)}` : null,
  ].filter(Boolean).join("\n\n");

  const { object } = await callLLMStructured({ systemPrompt, userPrompt });
  if (!object?.reply) {
    return { reply: "I’m here with you. Could you share a bit more?", needsProviderReview: false };
  }
  return object;
}

// Short draft when we know we’ll escalate to provider review
async function llmDraft({ modeName, stage, motherName, userText, extraContext, forceShort }) {
  if (!OPENAI_API_KEY) return "Draft pending provider review.";
  const sys = `
You are Mia, drafting a SHORT helpful reply (2–4 sentences) for a provider to review before sending to the mother.
Mode: ${modeName}. Stage: ${stage}.
Return ONLY plain text.
`.trim();

  const user = [
    motherName ? `Mother name: ${motherName}` : null,
    `User text:\n${userText}`,
    extraContext ? `Additional Context JSON:\n${JSON.stringify(extraContext, null, 2)}` : null,
    forceShort ? "Keep it brief and actionable." : null,
  ].filter(Boolean).join("\n\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI draft error:", res.status, errText);
    return "Draft pending provider review.";
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "Draft pending provider review.";
}
