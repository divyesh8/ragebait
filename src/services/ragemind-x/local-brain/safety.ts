import type { BrainSafetyReport, LocalBrainRequest, NlpAnalysis } from "@/services/ragemind-x/local-brain/types";

export function runBrainSafety(request: LocalBrainRequest, nlp: NlpAnalysis): BrainSafetyReport {
  const text = nlp.normalizedText;
  const promptInjectionSignals = findMatches(text, [
    { pattern: /\b(ignore|forget|override)\s+(all\s+)?(previous|system|developer|rules|instructions)\b/i, label: "Instruction override attempt." },
    { pattern: /\b(reveal|show|print|leak)\s+(your\s+)?(system prompt|hidden prompt|developer message|chain of thought)\b/i, label: "Hidden prompt extraction attempt." },
    { pattern: /\b(jailbreak|bypass|do anything now|unrestricted|developer mode)\b/i, label: "Jailbreak/bypass language." },
  ]);
  const contextPoisoningSignals = findMatches(text, [
    { pattern: /\b(for this conversation|from now on|new rule|you must always)\b/i, label: "Attempts to rewrite conversation policy." },
    { pattern: /\b(the real context is|actually the admin said|pretend the rules say)\b/i, label: "Context replacement attempt." },
  ]);
  const memoryPoisoningSignals = findMatches(text, [
    { pattern: /\b(remember this forever|store this as fact|update your knowledge|learn this now|add this to memory)\b/i, label: "Live memory update attempt." },
    { pattern: /\b(admin approved|creator approved|verified fact)\b/i, label: "Unverified approval claim." },
  ]);
  const spamSignals = detectSpam(request, nlp);
  const replaySignals = detectReplay(request);
  const abuseSignals = findMatches(text, [
    { pattern: /\b(kill yourself|kys|doxx|home address|swat|go die)\b/i, label: "Threat, self-harm, or doxxing phrase." },
    { pattern: /\b(nazi|terrorist|slur)\b/i, label: "Potential hate or extremist targeting phrase." },
  ]);
  const tokenLimitSignals = nlp.tokens.length > 1800 ? [`Input has ${nlp.tokens.length} local tokens; long-context compression required.`] : [];
  const rateLimitSignals = request.messages.length > 40 ? ["High message count in one brain request; rate limiting should be checked by caller."] : [];

  const riskScore =
    promptInjectionSignals.length * 28 +
    contextPoisoningSignals.length * 18 +
    memoryPoisoningSignals.length * 24 +
    spamSignals.length * 8 +
    replaySignals.length * 10 +
    abuseSignals.length * 32 +
    tokenLimitSignals.length * 12 +
    rateLimitSignals.length * 8;
  const riskLevel = riskScore >= 55 ? "high" : riskScore >= 22 ? "medium" : "low";

  return {
    riskLevel,
    action: riskLevel === "high" ? "quarantine" : riskLevel === "medium" ? "warn" : "continue",
    promptInjectionSignals,
    contextPoisoningSignals,
    memoryPoisoningSignals,
    spamSignals,
    replaySignals,
    abuseSignals,
    tokenLimitSignals,
    rateLimitSignals,
    securityLog: [
      `risk_score=${riskScore}`,
      `risk_level=${riskLevel}`,
      "live_learning=disabled",
      "external_inference=disabled",
      "raw_user_text_requires_offline_approval_before_knowledge_promotion",
    ],
  };
}

function findMatches(text: string, rules: { pattern: RegExp; label: string }[]): string[] {
  return rules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}

function detectSpam(request: LocalBrainRequest, nlp: NlpAnalysis): string[] {
  const signals: string[] = [];
  if (/(.)\1{9,}/u.test(nlp.normalizedText)) signals.push("Repeated-character flooding.");
  if ((nlp.normalizedText.match(/https?:\/\/|www\./gi)?.length ?? 0) >= 2) signals.push("Link-heavy input.");
  if (nlp.emoji.length >= 8 && nlp.tokens.filter((token) => token.kind === "word").length < 4) signals.push("Emoji-heavy low-language input.");
  const normalized = request.messages.map((message) => message.content.trim().toLowerCase().replace(/\s+/g, " "));
  const repeats = normalized.length - new Set(normalized).size;
  if (repeats > 0) signals.push(`Repeated identical message count: ${repeats}.`);
  return signals;
}

function detectReplay(request: LocalBrainRequest): string[] {
  const byContent = new Map<string, number>();
  for (const message of request.messages) {
    const key = message.content.toLowerCase().replace(/\s+/g, " ").trim();
    byContent.set(key, (byContent.get(key) ?? 0) + 1);
  }
  return [...byContent.entries()]
    .filter(([, count]) => count >= 3)
    .map(([content, count]) => `Possible replayed content (${count}x): ${content.slice(0, 80)}`);
}
