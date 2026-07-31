import type {
  BrainPersonalityConfig,
  BrainResponse,
  BrainSafetyReport,
  CriticReport,
  LocalBrainRequest,
  ModelAdapter,
  NlpAnalysis,
  RagReport,
  ReasoningReport,
  ResponsePlan,
  VectorMemoryReport,
} from "@/services/ragemind-x/local-brain/types";

export async function buildBrainResponse(input: {
  request: LocalBrainRequest;
  nlp: NlpAnalysis;
  safety: BrainSafetyReport;
  memory: VectorMemoryReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  personality: BrainPersonalityConfig;
  adapter: ModelAdapter;
}): Promise<BrainResponse> {
  const plan = planResponse(input);
  const draft = await draftResponse({ ...input, plan });
  const critic = critiqueDraft({ ...input, plan, draft });
  const improvedDraft = improveDraft(draft, critic, plan);
  const finalResponse = finalizeResponse(improvedDraft, plan, input.safety);
  return {
    plan,
    draft,
    critic,
    improvedDraft,
    finalResponse,
    streamableChunks: chunkText(finalResponse, 14),
    confidence: Math.min(plan.confidence, critic.confidence),
  };
}

export function planResponse(input: {
  request: LocalBrainRequest;
  nlp: NlpAnalysis;
  safety: BrainSafetyReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  personality: BrainPersonalityConfig;
}): ResponsePlan {
  const requestedTone = input.request.generation?.tone;
  const topLanguage = input.nlp.languages[0]?.language ?? input.request.locale ?? "English";
  const riskPenalty = input.safety.riskLevel === "high" ? 24 : input.safety.riskLevel === "medium" ? 10 : 0;
  const confidence = clamp(
    input.reasoning.confidence * 0.5 +
      input.retrieval.confidence * 0.25 +
      input.nlp.languageConfidence * 0.25 -
      riskPenalty
  );

  return {
    tone: requestedTone ?? input.personality.tone,
    length: input.request.generation?.maxTokens && input.request.generation.maxTokens < 90 ? "short" : "medium",
    humor: input.safety.riskLevel === "high" ? 0 : input.personality.humor,
    confidence,
    aggression: input.safety.riskLevel === "high" ? 0 : input.personality.aggression,
    creativity: input.personality.creativity,
    language: topLanguage,
    emojiUsage: input.safety.riskLevel === "low" ? input.personality.emojiFrequency : 0,
    battleStrategy: chooseBattleStrategy(input),
    internalSteps: [
      "Understand literal request and language mix.",
      "Retrieve relevant memory and offline knowledge.",
      "Reason through claims, risks, and likely intent.",
      "Draft a response tied to evidence.",
      "Run critic and rewrite before final output.",
    ],
    draftGoals: [
      "Stay local-only and avoid unsupported facts.",
      "Use retrieved evidence only as grounded support.",
      "Keep safety boundaries stronger than humor.",
      "Match tone and language confidence.",
    ],
  };
}

async function draftResponse(input: {
  request: LocalBrainRequest;
  nlp: NlpAnalysis;
  safety: BrainSafetyReport;
  memory: VectorMemoryReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  personality: BrainPersonalityConfig;
  adapter: ModelAdapter;
  plan: ResponsePlan;
}): Promise<string> {
  const prompt = buildPrompt(input);
  const generated = await input.adapter.generate({
    prompt,
    maxTokens: input.request.generation?.maxTokens ?? 180,
    temperature: input.plan.creativity / 100,
  });
  return generated.text;
}

export function critiqueDraft(input: {
  nlp: NlpAnalysis;
  safety: BrainSafetyReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  plan: ResponsePlan;
  draft: string;
}): CriticReport {
  const hallucinationWarnings = input.retrieval.evidence.length === 0 && /\baccording to|source|fact|study|data\b/i.test(input.draft)
    ? ["Draft references external facts without local evidence."]
    : [];
  const contradictionWarnings = input.reasoning.selfConsistency.warnings.filter((warning) => /contradict|unsupported|evidence/i.test(warning));
  const grammarWarnings = input.draft.length > 0 && !/[.!?]$/.test(input.draft.trim())
    ? ["Draft should end with complete punctuation."]
    : [];
  const contextWarnings = input.nlp.questionDetected && !/\b(answer|because|short version|directly)\b/i.test(input.draft)
    ? ["Question detected, but draft may not answer directly."]
    : [];
  const biasWarnings = input.nlp.codeSwitching && !/\bgrammar|meaning|mixed language|code-switch/i.test(input.draft)
    ? ["Mixed-language context should not be judged by grammar alone."]
    : [];
  const logicWarnings = input.reasoning.logical.length === 0 && input.nlp.conversationType === "qa"
    ? ["QA response has weak explicit reasoning."]
    : [];
  const relevanceWarnings = input.draft.length > 900 ? ["Draft is too long for the requested conversational response."] : [];
  const safetyWarnings = input.safety.action === "quarantine"
    ? ["Safety action is quarantine; final response must be conservative."]
    : [];
  const corrections = [
    ...hallucinationWarnings,
    ...contradictionWarnings,
    ...grammarWarnings,
    ...contextWarnings,
    ...biasWarnings,
    ...logicWarnings,
    ...relevanceWarnings,
    ...safetyWarnings,
  ];
  return {
    hallucinationWarnings,
    contradictionWarnings,
    grammarWarnings,
    contextWarnings,
    biasWarnings,
    logicWarnings,
    relevanceWarnings,
    safetyWarnings,
    confidence: clamp(input.plan.confidence - corrections.length * 6),
    rewriteRequired: corrections.length > 0,
    corrections,
  };
}

export function improveDraft(draft: string, critic: CriticReport, plan: ResponsePlan): string {
  let improved = draft.trim();
  if (!improved) improved = "I need a little more context to answer well, but I can still reason from the current message.";
  if (critic.hallucinationWarnings.length) {
    improved = improved.replace(/\b(according to|studies show|the data proves)\b/gi, "from the local context");
  }
  if (critic.contextWarnings.length) {
    improved = `Short version: ${improved}`;
  }
  if (critic.biasWarnings.length) {
    improved += " I am reading mixed-language phrasing by meaning and intent, not by grammar.";
  }
  if (critic.safetyWarnings.length) {
    improved = "I cannot help with bypassing rules, memory poisoning, threats, or unsafe escalation. I can still give a grounded, safe summary of the conversation.";
  }
  if (plan.length === "short" && improved.length > 420) improved = `${improved.slice(0, 417)}...`;
  if (!/[.!?]$/.test(improved)) improved += ".";
  return improved;
}

export function finalizeResponse(text: string, plan: ResponsePlan, safety: BrainSafetyReport): string {
  if (safety.action === "quarantine") return text;
  const confidenceLine = plan.confidence < 55 ? " Confidence is moderate, so I would keep this answer cautious." : "";
  return `${text}${confidenceLine}`;
}

function chooseBattleStrategy(input: {
  nlp: NlpAnalysis;
  safety: BrainSafetyReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  personality: BrainPersonalityConfig;
}): string {
  if (input.safety.riskLevel === "high") return "de-escalate and refuse unsafe or manipulative parts";
  if (input.nlp.conversationType === "battle" && input.reasoning.humor.length) return "use a contextual callback, then land one clean point";
  if (input.nlp.conversationType === "battle") return "prioritize relevance, counters, and concise punch";
  if (input.nlp.questionDetected) return "answer directly, then explain the evidence";
  if (input.retrieval.evidence.length) return "ground the response in retrieved local knowledge";
  return input.personality.reasoningStyle;
}

function buildPrompt(input: {
  request: LocalBrainRequest;
  nlp: NlpAnalysis;
  memory: VectorMemoryReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  plan: ResponsePlan;
}): string {
  const objective = input.request.generation?.objective ?? "respond naturally";
  const latest = input.request.messages.slice(-2).map((message) => message.content).join(" ");
  const evidence = input.retrieval.evidence.map((item) => `${item.title}: ${item.snippet}`).join(" ");
  const memory = input.memory.compressedSummary;
  const reasoning = [
    ...input.reasoning.logical,
    ...input.reasoning.conversation,
    ...input.reasoning.battle,
  ].slice(0, 5).join(" ");
  return [
    `Objective: ${objective}.`,
    `Tone: ${input.plan.tone}.`,
    `Language: ${input.plan.language}.`,
    `Latest user context: ${latest}.`,
    evidence ? `Evidence: ${evidence}.` : "",
    memory ? `Memory: ${memory}.` : "",
    reasoning ? `Reasoning signals: ${reasoning}.` : "",
  ].filter(Boolean).join(" ");
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks.length ? chunks : [text];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
