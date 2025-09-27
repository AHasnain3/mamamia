"use client";

import { CedarCopilot } from "cedar-os";
import React from "react";

export default function CedarProvider({ children }: { children: React.ReactNode }) {
  const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!openaiKey) {
    // Optional: render a clear message during dev
    console.warn("Missing NEXT_PUBLIC_OPENAI_API_KEY");
  }

  return (
    <CedarCopilot
      llmProvider={{
        provider: "openai",
        apiKey: openaiKey as string, // TS wants 'string', not string | undefined
      }}
    >
      {children}
    </CedarCopilot>
  );
}
