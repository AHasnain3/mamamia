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


// ===== Streaming & triage helpers =====

// Build Mia's system prompt (reusable for streaming or drafts)
export function buildMiaSystemPrompt({ mode, stage, motherName, forProviderDraft = false }) {
  const modeName =
    mode === "MOOD" ? "Mood & Well-Being"
    : mode === "BONDING" ? "Bonding & Baby Care"
    : mode === "HEALTH" ? "Health Advice"
    : "General Support";

  const base =
`You are Mia, a warm, evidence-based postpartum assistant for ${motherName || "the mother"}.
Be supportive, clear, and actionable. Avoid diagnosing or prescribing.`;

  const focus =
    mode === "MOOD"
      ? "Focus on mood, sleep, coping skills, normalizing emotions, and gentle next steps."
      : mode === "BONDING"
      ? "Focus on bonding, soothing, feeding cues, skin-to-skin, and realistic expectations."
      : mode === "HEALTH"
      ? "Focus on postpartum symptoms, red flags, recovery milestones, incision care. Avoid clinical directives; if urgent, recommend contacting provider/urgent care."
      : "General postpartum support and practical guidance.";

  const stageNote = `Mother stage: ${stage || "UNDIAGNOSED"}.`;
  const draftNote = forProviderDraft
    ? "Write a concise clinical-quality draft suitable for provider review."
    : "Write directly to the mother, in clear, empathetic language.";

  return `${base}\n${focus}\n${stageNote}\n${draftNote}`;
}

/**
 * Lightweight triage BEFORE streaming.
 * Uses your hard triggers first (no API call). Falls back to GREEN if nothing matches.
 * Return: { needsProviderReview:boolean, riskSignal:"GREEN"|"YELLOW"|"RED", reason?:string }
 */
export async function triageMia({ mode, userText }) {
  const lower = (userText || "").toLowerCase();

  // immediate RED for self-harm language
  if (/\b(suicide|kill myself|hurt myself|end it)\b/.test(lower)) {
    return { needsProviderReview: true, riskSignal: "RED", reason: "Self-harm language detected" };
  }

  // HEALTH + any hard trigger => route to provider (YELLOW)
  if (mode === "HEALTH" && PROVIDER_HARD_TRIGGERS.some(k => lower.includes(k))) {
    return { needsProviderReview: true, riskSignal: "YELLOW", reason: "Potential clinical/urgent topic" };
  }

  // otherwise stream is allowed
  return { needsProviderReview: false, riskSignal: "GREEN" };
}

// Allow passing extra (Cedar) context into the prompt
export async function* streamMiaText({ mode, stage, motherName, userText, systemOverride, extraContext }) {
  if (!OPENAI_API_KEY) {
    yield "Mia is offline (no API key set).";
    return;
  }
  const system = systemOverride || buildMiaSystemPrompt({ mode, stage, motherName });

  const userBlock = [
    `User Text: ${userText}`,
    extraContext ? `\nAdditional Context: ${JSON.stringify(extraContext)}` : null,
  ].filter(Boolean).join("");

  const messages = [
    { role: "system", content: system },
    { role: "user", content: userBlock },
  ];

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      stream: true,
      messages,
    }),
  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line || !line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (jsonStr === "[DONE]") return;
      try {
        const j = JSON.parse(jsonStr);
        const tok = j.choices?.[0]?.delta?.content || "";
        if (tok) yield tok;
      } catch {}
    }
  }
}
