import { normalizeTokens } from "@/services/ragemind-x/local-brain/embeddings";
import type {
  BrainSafetyReport,
  NlpAnalysis,
  RagReport,
  ReasoningReport,
  VectorMemoryReport,
} from "@/services/ragemind-x/local-brain/types";

export function buildReasoningReport(input: {
  nlp: NlpAnalysis;
  retrieval: RagReport;
  memory: VectorMemoryReport;
  safety: BrainSafetyReport;
  topic?: string;
}): ReasoningReport {
  const { nlp, retrieval, memory, safety } = input;
  const text = nlp.normalizedText;
  const tokens = normalizeTokens(text);
  const evidenceTitles = retrieval.evidence.map((item) => item.title);
  const memorySnippets = memory.selected.map((item) => item.item.summary ?? item.item.content.slice(0, 90));
  const claims = extractClaims(nlp);
  const counterArguments = buildCounterArguments(text, claims);
  const hypotheses = buildHypotheses(claims, retrieval, memory);
  const warnings = [
    ...safety.promptInjectionSignals,
    ...safety.contextPoisoningSignals,
    ...safety.memoryPoisoningSignals,
    retrieval.evidence.length === 0 ? "No local knowledge evidence was retrieved." : "",
    nlp.languageConfidence < 55 ? "Language confidence is low; response should stay cautious." : "",
  ].filter(Boolean);
  const graph = buildReasoningGraph(claims, evidenceTitles, memorySnippets, counterArguments);
  const confidence = confidenceScore({
    claimCount: claims.length,
    evidenceCount: retrieval.evidence.length,
    memoryHits: memory.selected.length,
    safetyRisk: safety.riskLevel,
    languageConfidence: nlp.languageConfidence,
    warningCount: warnings.length,
  });

  return {
    literal: [
      `Parsed ${nlp.sentences.length} sentence${nlp.sentences.length === 1 ? "" : "s"} and ${nlp.tokens.length} token${nlp.tokens.length === 1 ? "" : "s"}.`,
      nlp.questionDetected ? "A question was detected." : "No direct question marker dominates.",
      nlp.commandDetected ? "A command/request was detected." : "No strong command marker dominates.",
    ],
    logical: logicSignals(text),
    deductive: deductiveSignals(text, retrieval),
    inductive: inductiveSignals(tokens, memory),
    abductive: abductiveSignals(nlp, retrieval),
    probabilistic: [
      `Confidence blends language=${nlp.languageConfidence}, evidence=${retrieval.evidence.length}, memory=${memory.selected.length}, safety=${safety.riskLevel}.`,
      confidence < 60 ? "Alternative interpretations remain plausible." : "Primary interpretation is stable enough for response planning.",
    ],
    causal: causalSignals(text),
    temporal: temporalSignals(text),
    spatial: spatialSignals(text),
    conversation: conversationSignals(nlp, memory),
    humor: humorSignals(text),
    sarcasm: sarcasmSignals(text),
    debate: debateSignals(text, retrieval),
    social: socialSignals(text),
    psychological: psychologicalSignals(text),
    strategic: strategicSignals(text, input.topic),
    battle: battleSignals(text, input.topic),
    counterArguments,
    hypotheses,
    evidenceEvaluation: [
      retrieval.evidence.length ? `Retrieved evidence: ${evidenceTitles.join(", ")}.` : "No external-to-transcript local evidence selected.",
      memory.selected.length ? `Memory hits: ${memory.selected.length}.` : "No durable memory was needed.",
      safety.riskLevel !== "low" ? `Safety risk is ${safety.riskLevel}; public response should be conservative.` : "Safety risk is low.",
    ],
    selfConsistency: { passed: warnings.length === 0, warnings },
    graph,
    confidence,
  };
}

function extractClaims(nlp: NlpAnalysis): string[] {
  return nlp.sentences
    .map((sentence) => sentence.text.trim())
    .filter((sentence) => sentence.length > 8)
    .slice(0, 8);
}

function buildCounterArguments(text: string, claims: string[]): string[] {
  const counters = [];
  if (/\b(always|never|everyone|nobody|only)\b/i.test(text)) counters.push("Check absolute claims; they may overstate the case.");
  if (/\b(because|therefore|proof|evidence)\b/i.test(text) && !/\b(source|data|example|for instance)\b/i.test(text)) {
    counters.push("Reasoning terms appear, but concrete evidence may be thin.");
  }
  if (/\b(roast|cooked|ratio|clown)\b/i.test(text)) counters.push("Roast impact should be separated from factual accuracy.");
  if (!counters.length && claims.length) counters.push("A reasonable counter is to ask whether the strongest claim is supported by transcript evidence.");
  return counters.slice(0, 5);
}

function buildHypotheses(claims: string[], retrieval: RagReport, memory: VectorMemoryReport): ReasoningReport["hypotheses"] {
  return claims.slice(0, 4).map((claim, index) => ({
    claim,
    support: clamp(42 + retrieval.evidence.length * 8 + memory.selected.length * 4 - index * 5),
    evidence: [
      retrieval.evidence[index % Math.max(retrieval.evidence.length, 1)]?.title,
      memory.selected[index % Math.max(memory.selected.length, 1)]?.item.summary,
    ].filter(Boolean) as string[],
  }));
}

function buildReasoningGraph(
  claims: string[],
  evidence: string[],
  memories: string[],
  counters: string[]
): ReasoningReport["graph"] {
  const nodes = [
    "input",
    ...claims.map((_, index) => `claim_${index + 1}`),
    ...evidence.map((_, index) => `evidence_${index + 1}`),
    ...memories.map((_, index) => `memory_${index + 1}`),
    ...counters.map((_, index) => `counter_${index + 1}`),
    "response_plan",
  ];
  const edges = [
    ...claims.map((_, index) => ({ from: "input", to: `claim_${index + 1}`, label: "contains" })),
    ...evidence.map((_, index) => ({ from: `evidence_${index + 1}`, to: "response_plan", label: "supports" })),
    ...memories.map((_, index) => ({ from: `memory_${index + 1}`, to: "response_plan", label: "context" })),
    ...counters.map((_, index) => ({ from: `counter_${index + 1}`, to: "response_plan", label: "challenge" })),
  ];
  return { nodes: [...new Set(nodes)].slice(0, 32), edges: edges.slice(0, 48) };
}

function logicSignals(text: string): string[] {
  return [
    /\b(because|therefore|so|hence)\b/i.test(text) ? "Cause/effect connectors present." : "",
    /\b(proof|evidence|data|source|receipts)\b/i.test(text) ? "Evidence markers present." : "",
    /\b(but|however|actually|except|although)\b/i.test(text) ? "Contrast or rebuttal marker present." : "",
  ].filter(Boolean);
}

function deductiveSignals(text: string, retrieval: RagReport): string[] {
  return [
    /\b(if|then|therefore|must|cannot)\b/i.test(text) ? "Deductive form may be present." : "No strong deductive form detected.",
    retrieval.evidence.length ? "Deduction can be grounded against retrieved local rules." : "Deduction should avoid unsupported external facts.",
  ];
}

function inductiveSignals(tokens: string[], memory: VectorMemoryReport): string[] {
  const repeated = tokens.length - new Set(tokens).size;
  return [
    repeated > 6 ? `Repeated token patterns support an inductive style inference (${repeated} repeats).` : "Few repeated terms; induction is weak.",
    memory.clusters.length ? `Topic clusters available: ${memory.clusters.map((cluster) => cluster.topic).join(", ")}.` : "No memory clusters available.",
  ];
}

function abductiveSignals(nlp: NlpAnalysis, retrieval: RagReport): string[] {
  const topIntent = nlp.intents[0]?.label ?? "unknown";
  return [
    `Best explanation for the turn is ${topIntent}.`,
    retrieval.evidence[0] ? `Most relevant local evidence is ${retrieval.evidence[0].title}.` : "No local evidence changes the best explanation.",
  ];
}

function causalSignals(text: string): string[] {
  return [/\b(because|caused|led to|made|so that|result)\b/i.test(text) ? "Causal language detected." : "No explicit causal chain detected."];
}

function temporalSignals(text: string): string[] {
  return [/\b(before|after|then|now|later|earlier|round|first|finally)\b/i.test(text) ? "Temporal ordering is relevant." : "No temporal ordering signal detected."];
}

function spatialSignals(text: string): string[] {
  return [/\b(above|below|inside|outside|left|right|near|far|home|arena)\b/i.test(text) ? "Spatial terms detected." : "No spatial reasoning needed."];
}

function conversationSignals(nlp: NlpAnalysis, memory: VectorMemoryReport): string[] {
  return [
    `Conversation type: ${nlp.conversationType}.`,
    nlp.coreferences.length ? `Coreference links: ${nlp.coreferences.length}.` : "No strong pronoun resolution dependency.",
    memory.selected.length ? "Prior context can influence wording." : "Response can rely on current turn.",
  ];
}

function humorSignals(text: string): string[] {
  return [
    /\b(lol|lmao|haha|joke|meme|funny|wild)\b/i.test(text) ? "Explicit humor marker present." : "",
    /\b(cooked|ratio|mid|npc|skill issue|brainrot)\b/i.test(text) ? "Internet roast humor marker present." : "",
  ].filter(Boolean);
}

function sarcasmSignals(text: string): string[] {
  return [
    /\b(sure bro|nice logic|great job|wow genius|totally)\b/i.test(text) ? "Possible mock praise sarcasm." : "",
    /\b(yeah right|as if)\b/i.test(text) ? "Possible ironic disagreement." : "",
  ].filter(Boolean);
}

function debateSignals(text: string, retrieval: RagReport): string[] {
  return [
    /\b(counter|claim|argument|premise|conclusion|evidence)\b/i.test(text) ? "Debate structure is active." : "Debate structure is light.",
    retrieval.evidence.some((item) => item.category === "debate") ? "Debate knowledge was retrieved." : "",
  ].filter(Boolean);
}

function socialSignals(text: string): string[] {
  return [
    /\b(audience|everyone|people|public|chat|crowd)\b/i.test(text) ? "Audience/social pressure is part of the exchange." : "Social pressure is not dominant.",
    /\b(respect|gg|valid|fair)\b/i.test(text) ? "Respect/de-escalation marker present." : "",
  ].filter(Boolean);
}

function psychologicalSignals(text: string): string[] {
  return [
    /\b(scared|mad|triggered|confident|cope|cry|pressure|nervous)\b/i.test(text) ? "Psychological pressure cue detected." : "No strong psychological pressure cue.",
  ];
}

function strategicSignals(text: string, topic?: string): string[] {
  return [
    topic ? `Keep response anchored to topic: ${topic}.` : "No explicit topic provided.",
    /\b(callback|again|same|repeat|still)\b/i.test(text) ? "Callback/repetition can be used strategically." : "No callback strategy detected.",
  ];
}

function battleSignals(text: string, topic?: string): string[] {
  return [
    /\b(roast|battle|winner|round|opponent|creator|judge)\b/i.test(`${topic ?? ""} ${text}`) ? "Battle context detected." : "Battle context is weak.",
    /\b(threat|doxx|kill yourself|kys)\b/i.test(text) ? "Safety overrides entertainment value." : "No high-risk battle override phrase detected.",
  ];
}

function confidenceScore(input: {
  claimCount: number;
  evidenceCount: number;
  memoryHits: number;
  safetyRisk: "low" | "medium" | "high";
  languageConfidence: number;
  warningCount: number;
}): number {
  const safetyPenalty = input.safetyRisk === "high" ? 24 : input.safetyRisk === "medium" ? 10 : 0;
  return clamp(
    42 +
      input.claimCount * 3 +
      input.evidenceCount * 7 +
      input.memoryHits * 3 +
      input.languageConfidence * 0.22 -
      input.warningCount * 4 -
      safetyPenalty
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
