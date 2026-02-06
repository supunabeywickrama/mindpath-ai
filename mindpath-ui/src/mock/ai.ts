export type AiMode = "summarize" | "rewrite" | "plan";

export function mockJournalAi(mode: AiMode, text: string) {
  const base = text.trim();
  if (!base) return "No content to process.";

  if (mode === "summarize") {
    return [
      "Summary (mock):",
      "• Main feeling: low / overwhelmed",
      "• Main trigger: stress or fatigue",
      "• Helpful action: small breathing or short walk",
      "",
      "Note: Later this will use LLM + RAG.",
    ].join("\n");
  }

  if (mode === "rewrite") {
    return [
      "Gentle rewrite (mock):",
      "It sounds like today felt heavy and exhausting. You did your best with what you had.",
      "If you can, one small step is enough — even a few slow breaths or a short stretch.",
      "",
      "Note: Later this will be an AI rewrite with safety rules.",
    ].join("\n");
  }

  return [
    "1 small plan (mock):",
    "1) 2 minutes: breathe in 4s, out 6s × 5",
    "2) 5 minutes: stand outside or near a window",
    "3) Message someone: “Can we talk later?”",
    "",
    "Note: Later this will be personalized using your logs.",
  ].join("\n");
}
