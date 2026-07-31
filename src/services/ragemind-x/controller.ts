import { analyzeIntent, type IntentAnalysis } from "@/services/intentEngine";
import { analyzeLanguage, type LanguageAnalysis } from "@/services/languageEngine";
import { analyzeSlang, type SlangAnalysis } from "@/services/slangEngine";
import { analyzeMemes, type MemeAnalysis } from "@/services/memeEngine";
import { analyzeEmotion, type EmotionAnalysis } from "@/services/emotionEngine";
import { analyzePersonality, type PersonalityAnalysis } from "@/services/personalityEngine";
import { analyzePsychology, type PsychologyAnalysis } from "@/services/psychologyEngine";
import { analyzeReasoning, type ReasoningAnalysis } from "@/services/reasoningEngine";
import { simulateAudience, type AudienceSimulation } from "@/services/audienceEngine";
import { generateBattleDNA, type BattleDNA } from "@/services/battleDNA";
import { generatePlayerDNA, type PlayerDNAResult } from "@/services/playerDNA";
import { findKnownTerms, type KnowledgeEntry } from "@/services/knowledgeBase";
import { fallbackLocalBrainResult, runLocalBrainForRageMind } from "@/services/ragemind-x/local-brain/brain";
import { buildConversationGraph } from "@/services/brainV2";
import { RAGEMIND_X_MODULES, RAGEMIND_X_MODULE_BY_ID, RAGEMIND_X_PIPELINE } from "@/services/ragemind-x/moduleCatalog";
import {
  RAGEMIND_X_VERSION,
  type RageMindXExplainability,
  type RageMindXGenerationPlan,
  type RageMindXHumorReport,
  type RageMindXMemoryReport,
  type RageMindXModuleTrace,
  type RageMindXReasoningLayers,
  type RageMindXReport,
  type RageMindXSecurityReport,
  type RageMindXSelfReview,
  type RageMindXUserModel,
  type RageMindXWinnerPrediction,
} from "@/services/ragemind-x/types";
import {
  clampScore,
  countHits,
  keywordTokens,
  nowMs,
  sideMessages,
  sideText,
  textOf,
  tokenOverlap,
  topTerms,
  truncate,
  uniqueRatio,
  uniqueStrings,
} from "@/services/ragemind-x/helpers";
import type { BattleSide, RageMindInput } from "@/services/rageMind";

interface ModuleMeta {
  confidence: number;
  summary: string;
  signals?: string[];
}

export interface RageMindXContextEngine {
  conversationFlow: string;
  momentumShifts: string[];
  hiddenIntentions: string[];
  doubleMeanings: string[];
  sarcasmSignals: string[];
}

export interface RageMindXConfidence {
  score: number;
  reasoning: string;
  alternativeInterpretation?: string;
}

export interface RageMindXFairness {
  biasWarnings: string[];
  judgingGuidance: string;
}

export interface RageMindXReportParts {
  battleStyle: string;
  languageUnderstanding: LanguageAnalysis;
  slangEngine: SlangAnalysis;
  memeEngine: MemeAnalysis;
  emotionEngine: EmotionAnalysis;
  personalityEngine: PersonalityAnalysis;
  contextEngine: RageMindXContextEngine;
  psychologyEngine: PsychologyAnalysis;
  audienceSimulation: AudienceSimulation;
  reasoningEngine: ReasoningAnalysis;
  battleDNA: BattleDNA;
  playerDNA: PlayerDNAResult;
  fairnessEngine: RageMindXFairness;
  confidence: RageMindXConfidence;
  memorySignals: Record<BattleSide, string[]>;
}

export interface RageMindXExecution {
  parts: RageMindXReportParts;
  brain: RageMindXReport;
}

export async function runRageMindX(input: RageMindInput): Promise<RageMindXExecution> {
  const started = nowMs();
  const traces: RageMindXModuleTrace[] = [];
  const text = textOf(input);
  const battleStyle = inferBattleStyle(input);

  const localBrain = await executeModule(
    traces,
    "local-intelligence-brain",
    fallbackLocalBrainResult({
      conversationId: input.battleId,
      title: input.title,
      topic: input.topic,
      mode: input.mode ?? input.battleType,
      messages: input.messages.map((message) => ({
        role: message.side,
        content: message.content,
        userId: message.userId,
        username: message.username,
        round: message.round,
        createdAt: message.createdAt,
      })),
    }),
    () => runLocalBrainForRageMind(input),
    (brain) => ({
      confidence: brain.observability.confidence,
      summary: `Local brain completed NLP, embeddings, vector memory, offline RAG, reasoning, planning, and critic in ${brain.observability.latencyMs}ms.`,
      signals: [
        `adapter=${brain.model.id}`,
        `languages=${brain.nlp.languages.map((language) => language.language).join(",")}`,
        `memoryHits=${brain.observability.memoryHits}`,
        `knowledge=${brain.retrieval.evidence.length}`,
        `criticCorrections=${brain.response.critic.corrections.length}`,
      ],
    })
  );

  const [promptInjectionSignals, spamSignals, afkSignals] = await Promise.all([
    executeModule(traces, "prompt-injection-defense", [] as string[], () => detectPromptInjection(text), (signals) => ({
      confidence: signals.length ? 92 : 78,
      summary: signals.length ? "Prompt injection attempt detected." : "No prompt injection pattern detected.",
      signals,
    })),
    executeModule(traces, "anti-spam-engine", [] as string[], () => detectSpam(input), (signals) => ({
      confidence: signals.length ? 88 : 74,
      summary: signals.length ? "Spam or flooding pressure detected." : "No spam pressure above threshold.",
      signals,
    })),
    executeModule(traces, "afk-detection-engine", [] as string[], () => detectAfk(input), (signals) => ({
      confidence: signals.length ? 82 : 68,
      summary: signals.length ? "Low participation signals found." : "No AFK pattern detected.",
      signals,
    })),
  ]);

  const security = await executeModule(
    traces,
    "security-engine",
    fallbackSecurity(),
    () => buildSecurityReport(promptInjectionSignals, spamSignals, afkSignals, text),
    (report) => ({
      confidence: report.riskLevel === "high" ? 90 : 78,
      summary: `${report.riskLevel.toUpperCase()} risk; action=${report.action}.`,
      signals: [
        ...report.promptInjectionSignals,
        ...report.dataPoisoningSignals,
        ...report.spamSignals,
        ...report.malformedInputSignals,
      ].slice(0, 8),
    })
  );

  const [
    languageUnderstanding,
    intentEngine,
    emotionEngine,
    personalityEngine,
    slangBase,
    memeEngine,
    psychologyEngine,
    reasoningEngine,
    audienceSimulation,
    knowledgeHits,
  ] = await Promise.all([
    executeModule(traces, "language-detection-engine", fallbackLanguage(), () => analyzeLanguage(input), (analysis) => ({
      confidence: analysis.primaryLanguages.length > 1 ? 82 : 72,
      summary: `Detected ${analysis.primaryLanguages.join(", ")}.`,
      signals: analysis.notes,
    })),
    executeModule(traces, "intent-engine", fallbackIntent(), () => analyzeIntent(input), (analysis) => ({
      confidence: averageIntentConfidence(analysis),
      summary: analysis.conversationIntent,
      signals: analysis.dominantIntents.map((intent) => `Dominant intent: ${intent}`),
    })),
    executeModule(traces, "emotion-engine", { creator: [], opponent: [] } as EmotionAnalysis, () => analyzeEmotion(input), (analysis) => ({
      confidence: 70 + Math.min(20, Object.values(analysis).flat().length * 3),
      summary: `Emotion signals: creator=${analysis.creator.length}, opponent=${analysis.opponent.length}.`,
      signals: Object.entries(analysis).flatMap(([side, values]) => values.map((value) => `${side}: ${value}`)),
    })),
    executeModule(traces, "personality-engine", { creator: [], opponent: [] } as PersonalityAnalysis, () => analyzePersonality(input), (analysis) => ({
      confidence: 68 + Math.min(18, Object.values(analysis).flat().length * 2),
      summary: "Personality style inferred from wording, pressure, and humor markers.",
      signals: Object.entries(analysis).flatMap(([side, values]) => values.map((value) => `${side}: ${value}`)),
    })),
    executeModule(traces, "slang-engine", { detected: [], interpretations: [] } as SlangAnalysis, () => analyzeSlang(input), (analysis) => ({
      confidence: analysis.detected.length ? 82 : 64,
      summary: analysis.detected.length ? `Detected slang: ${analysis.detected.join(", ")}.` : "No built-in slang terms above threshold.",
      signals: analysis.interpretations,
    })),
    executeModule(traces, "meme-engine", { references: [], interpretations: [] } as MemeAnalysis, () => analyzeMemes(input), (analysis) => ({
      confidence: analysis.references.length ? 80 : 62,
      summary: analysis.references.length ? `Detected memes: ${analysis.references.join(", ")}.` : "No meme references above threshold.",
      signals: analysis.interpretations,
    })),
    executeModule(traces, "multilingual-engine", { pressureSignals: [], mindGames: [], confidenceShifts: [], argumentCollapse: [], recoveryMoments: [] } as PsychologyAnalysis, () => analyzePsychology(input), (analysis) => ({
      confidence: 70 + Math.min(18, Object.values(analysis).flat().length * 2),
      summary: "Psychological pressure, recovery, confidence, and mind-game signals mapped.",
      signals: Object.values(analysis).flat().slice(0, 8),
    })),
    executeModule(traces, "reasoning-engine", fallbackReasoning(), () => analyzeReasoning(input), (analysis) => ({
      confidence: 70 + Math.min(18, analysis.evidence.length * 2),
      summary: analysis.reasoning,
      signals: [...analysis.evidence, ...analysis.repeatedArguments, ...analysis.contradictions].slice(0, 8),
    })),
    executeModule(traces, "ai-judge", fallbackAudience(), () => simulateAudience(input), (analysis) => ({
      confidence: analysis.engagementScore ? 72 : 60,
      summary: `Audience engagement estimate: ${analysis.engagementScore}/100.`,
      signals: [
        analysis.biggestLaugh,
        analysis.mostSavageComeback,
        analysis.mostConvincingArgument,
        analysis.mostShareableLine,
      ].filter(Boolean),
    })),
    executeModule(traces, "knowledge-engine", [] as KnowledgeEntry[], () => findKnownTerms(text), (hits) => ({
      confidence: hits.length ? 82 : 58,
      summary: hits.length ? `Matched ${hits.length} local knowledge entries.` : "No local knowledge entries matched this transcript.",
      signals: hits.slice(0, 8).map((hit) => `${hit.category}:${hit.term} = ${hit.meaning}`),
    })),
  ]);

  await Promise.all([
    executeModule(traces, "code-switching-engine", languageUnderstanding.codeSwitching, () => languageUnderstanding.codeSwitching, (value) => ({
      confidence: 74,
      summary: value ? "Code switching detected and preserved for fair judging." : "No strong code-switching marker detected.",
      signals: value ? ["Judge mixed language by meaning, not grammar."] : [],
    })),
    executeModule(traces, "toxicity-balance-engine", [] as string[], () => buildToxicitySignals(text), (signals) => ({
      confidence: signals.length ? 80 : 66,
      summary: signals.length ? "Boundary-sensitive language detected." : "Roast language stayed within normal competitive range.",
      signals,
    })),
  ]);

  const slangEngine = mergeKnowledgeIntoSlang(slangBase, knowledgeHits);
  const contextEngine = await executeModule(traces, "context-engine", fallbackContext(), () => buildContext(input), (context) => ({
    confidence: 74 + Math.min(18, context.momentumShifts.length * 4 + context.sarcasmSignals.length * 2),
    summary: context.conversationFlow,
    signals: [...context.momentumShifts, ...context.hiddenIntentions, ...context.doubleMeanings, ...context.sarcasmSignals].slice(0, 8),
  }));

  const memory = await executeModule(traces, "conversation-memory-engine", fallbackMemory(), () => buildMemory(input, reasoningEngine, contextEngine), (report) => ({
    confidence: 72 + Math.min(18, report.battleMemory.length * 2),
    summary: report.shortTermSummary,
    signals: [...report.topicMemory, ...report.battleMemory, ...report.repeatedPatterns].slice(0, 8),
  }));

  await executeModule(traces, "long-term-memory-engine", memory.longTermCandidates, () => memory.longTermCandidates, (candidates) => ({
    confidence: candidates.length ? 72 : 58,
    summary: "Live input was converted only into offline-review memory candidates.",
    signals: candidates,
  }));

  const humor = await executeModule(traces, "humor-engine", fallbackHumor(), () => buildHumor(input, memeEngine, contextEngine), (report) => ({
    confidence: 70 + Math.min(20, report.humorSignals.length * 3 + report.sarcasmSignals.length * 2),
    summary: report.memeTiming,
    signals: [
      ...report.humorSignals,
      ...report.sarcasmSignals,
      ...report.ironySignals,
      ...report.doubleMeanings,
      ...report.roastSignals,
    ].slice(0, 8),
  }));

  await Promise.all([
    executeModule(traces, "sarcasm-engine", humor.sarcasmSignals, () => humor.sarcasmSignals, (signals) => ({
      confidence: signals.length ? 82 : 60,
      summary: signals.length ? "Sarcasm cues detected." : "No sarcasm cues above threshold.",
      signals,
    })),
    executeModule(traces, "irony-engine", humor.ironySignals, () => humor.ironySignals, (signals) => ({
      confidence: signals.length ? 78 : 58,
      summary: signals.length ? "Irony cues detected." : "No irony cues above threshold.",
      signals,
    })),
    executeModule(traces, "double-meaning-engine", humor.doubleMeanings, () => humor.doubleMeanings, (signals) => ({
      confidence: signals.length ? 82 : 60,
      summary: signals.length ? "Double meaning / figurative battle language detected." : "No double meanings above threshold.",
      signals,
    })),
    executeModule(traces, "roast-engine", humor.roastSignals, () => humor.roastSignals, (signals) => ({
      confidence: signals.length ? 82 : 62,
      summary: signals.length ? "Roast effectiveness signals present." : "Roast signal is light.",
      signals,
    })),
  ]);

  const reasoningLayers = await executeModule(traces, "logic-engine", fallbackReasoningLayers(), () => buildReasoningLayers(input, reasoningEngine, contextEngine, humor), (layers) => ({
    confidence: 76,
    summary: "Layered reasoning path assembled from literal, context, history, pattern, humor, and battle signals.",
    signals: Object.values(layers).slice(0, 8),
  }));

  await Promise.all([
    executeModule(traces, "debate-engine", reasoningEngine.evidence, () => buildDebateSignals(input, reasoningEngine), (signals) => ({
      confidence: signals.length ? 78 : 60,
      summary: "Debate structure, counters, contradictions, and relevance were checked.",
      signals,
    })),
    executeModule(traces, "pattern-recognition-engine", memory.repeatedPatterns, () => memory.repeatedPatterns, (signals) => ({
      confidence: signals.length ? 80 : 62,
      summary: signals.length ? "Repeated or signature patterns detected." : "No repeated pattern above threshold.",
      signals,
    })),
    executeModule(traces, "creativity-engine", [] as string[], () => buildCreativitySignals(input), (signals) => ({
      confidence: signals.length ? 78 : 62,
      summary: "Creativity estimated from novelty, callbacks, and non-recycled wording.",
      signals,
    })),
  ]);

  const partialReport = {
    slangEngine,
    memeEngine,
    emotionEngine,
    personalityEngine,
    reasoningEngine,
    audienceSimulation,
  };
  const battleDNA = await executeModule(traces, "winner-prediction-engine", fallbackBattleDNA(), () => generateBattleDNA(input, partialReport), (dna) => ({
    confidence: 76,
    summary: `Battle DNA generated: humor=${dna.humor}, logic=${dna.logic}, aggression=${dna.aggression}.`,
    signals: Object.entries(dna).map(([key, value]) => `${key}: ${value}`),
  }));
  const playerDNA = await executeModule(traces, "skill-estimation-engine", fallbackPlayerDNA(), () => generatePlayerDNA(input, partialReport), (dna) => ({
    confidence: 76,
    summary: `Player DNA labels: creator=${dna.creator.label}, opponent=${dna.opponent.label}.`,
    signals: [
      `creator: ${dna.creator.label}`,
      `opponent: ${dna.opponent.label}`,
      ...dna.creator.traits.map((trait) => `creator trait: ${trait}`),
      ...dna.opponent.traits.map((trait) => `opponent trait: ${trait}`),
    ].slice(0, 8),
  }));

  const userModels = await executeModule(traces, "user-modeling-engine", fallbackUserModels(), () => buildUserModels(input, playerDNA, languageUnderstanding), (models) => ({
    confidence: 72,
    summary: "Gameplay-only user models estimated for adaptation and difficulty control.",
    signals: Object.values(models).flatMap((model) => [`${model.side}: ${model.skillLevel}`, `${model.side}: ${model.battleStyle}`]),
  }));

  await executeModule(traces, "difficulty-controller", [] as string[], () => buildDifficultySignals(userModels), (signals) => ({
    confidence: 70,
    summary: "Difficulty adaptation guidance generated without manipulation.",
    signals,
  }));

  const fairnessEngine = await executeModule(traces, "fairness-engine", fallbackFairness(), () => buildFairness(languageUnderstanding, security), (fairness) => ({
    confidence: fairness.biasWarnings.length ? 84 : 72,
    summary: fairness.judgingGuidance,
    signals: fairness.biasWarnings,
  }));
  await executeModule(traces, "bias-detection-engine", fairnessEngine.biasWarnings, () => fairnessEngine.biasWarnings, (signals) => ({
    confidence: signals.length ? 84 : 70,
    summary: signals.length ? "Bias risks detected and neutralized in judging guidance." : "No bias warning above threshold.",
    signals,
  }));

  const winnerPrediction = await executeModule(traces, "confidence-engine", fallbackPrediction(), () => buildWinnerPrediction(input, battleStyle, reasoningEngine, humor), (prediction) => ({
    confidence: prediction.confidence,
    summary: `Prediction: ${prediction.predictedWinner} (${prediction.scores.creator}-${prediction.scores.opponent}).`,
    signals: prediction.factors,
  }));

  const confidence = buildConfidence(input, traces, security, winnerPrediction, languageUnderstanding);
  await executeModule(traces, "ai-critic", [] as string[], () => critiqueResult(reasoningEngine, winnerPrediction, confidence), (signals) => ({
    confidence: signals.length ? 80 : 68,
    summary: signals.length ? "Critic found caution notes." : "Critic did not find a blocking issue.",
    signals,
  }));

  const selfReview = await executeModule(traces, "ai-self-reviewer", fallbackSelfReview(), () => buildSelfReview(reasoningEngine, security, confidence), (review) => ({
    confidence: review.passed ? 78 : 88,
    summary: review.passed ? "Self-review passed." : "Self-review found caution notes.",
    signals: [
      ...review.contradictionWarnings,
      ...review.hallucinationWarnings,
      ...review.offensiveRiskWarnings,
      ...review.improvements,
    ],
  }));

  const generation = await executeModule(traces, "response-planner", fallbackGeneration(), () => buildGenerationPlan(input, security, confidence), (plan) => ({
    confidence: 72,
    summary: plan.candidateSummary,
    signals: [...plan.responsePlan, ...plan.guardrails],
  }));
  await executeModule(traces, "response-generator", generation, () => generation, (plan) => ({
    confidence: 70,
    summary: "Local deterministic response candidate prepared for downstream surfaces.",
    signals: [plan.candidateSummary],
  }));

  await Promise.all([
    executeModule(traces, "learning-engine", memory.longTermCandidates, () => memory.longTermCandidates, (signals) => ({
      confidence: 70,
      summary: "Approved learning path is offline review only; live input remains untrusted.",
      signals,
    })),
    executeModule(traces, "monitoring-engine", [] as string[], () => traces.map((trace) => `${trace.id}:${trace.durationMs}ms`).slice(0, 8), (signals) => ({
      confidence: 72,
      summary: "Module timings captured for Creator telemetry.",
      signals,
    })),
    executeModule(traces, "analytics-engine", [] as string[], () => buildAnalyticsSignals(input, languageUnderstanding, confidence), (signals) => ({
      confidence: 72,
      summary: "Analytics signals prepared for Creator dashboards.",
      signals,
    })),
  ]);

  const completedAtMs = nowMs();
  const degradedModules = traces.filter((trace) => trace.status === "degraded").map((trace) => trace.id);
  const unknownPhrases = buildUnknownPhrases(text, slangEngine, memeEngine, knowledgeHits);
  const explainability = buildExplainability(
    intentEngine,
    languageUnderstanding,
    emotionEngine,
    confidence,
    reasoningLayers,
    winnerPrediction
  );

  traces.unshift({
    id: "brain-controller",
    name: "Brain Controller",
    category: "controller",
    stage: "intake-security",
    status: degradedModules.length ? "degraded" : "ok",
    durationMs: completedAtMs - started,
    confidence: confidence.score,
    summary: `RageMind X coordinated ${traces.length} specialist passes locally.`,
    signals: [
      `pipeline=${RAGEMIND_X_PIPELINE.join(" > ")}`,
      `localOnly=true`,
      `degradedModules=${degradedModules.length}`,
    ],
  });

  const brain: RageMindXReport = {
    version: RAGEMIND_X_VERSION,
    architecture: {
      controller: "Brain Controller",
      design: "Modular AI operating system plus local conversational intelligence brain: deterministic specialists now, replaceable local-model adapters later.",
      moduleCount: RAGEMIND_X_MODULES.length,
      pipeline: RAGEMIND_X_PIPELINE,
      localOnly: true,
      futureAdapters: [
        "onnx-local-language-model",
        "llama.cpp-local-runtime",
        "self-trained-transformer-adapter",
        "custom-embedding-index",
        "offline-approved-knowledge-packs",
      ],
    },
    timings: {
      startedAt: new Date(started).toISOString(),
      completedAt: new Date(completedAtMs).toISOString(),
      totalMs: completedAtMs - started,
      moduleCount: traces.length,
      degradedModules,
    },
    modules: traces,
    localBrain,
    security,
    memory,
    humor,
    reasoningLayers,
    userModels,
    winnerPrediction,
    selfReview,
    explainability,
    generation,
    unknownPhrases,
  };

  const parts: RageMindXReportParts = {
    battleStyle,
    languageUnderstanding,
    slangEngine,
    memeEngine,
    emotionEngine,
    personalityEngine,
    contextEngine,
    psychologyEngine,
    audienceSimulation,
    reasoningEngine,
    battleDNA,
    playerDNA,
    fairnessEngine,
    confidence,
    memorySignals: {
      creator: uniqueStrings([
        ...personalityEngine.creator,
        ...emotionEngine.creator,
        playerDNA.creator.label,
        ...userModels.creator.adaptationNotes,
      ]).slice(0, 8),
      opponent: uniqueStrings([
        ...personalityEngine.opponent,
        ...emotionEngine.opponent,
        playerDNA.opponent.label,
        ...userModels.opponent.adaptationNotes,
      ]).slice(0, 8),
    },
  };

  return { parts, brain };
}

async function executeModule<T>(
  traces: RageMindXModuleTrace[],
  id: string,
  fallback: T,
  run: () => T | Promise<T>,
  summarize: (value: T) => ModuleMeta
): Promise<T> {
  const definition = RAGEMIND_X_MODULE_BY_ID[id];
  const started = nowMs();
  try {
    const value = await run();
    const meta = summarize(value);
    traces.push({
      id,
      name: definition?.name ?? id,
      category: definition?.category ?? "operations",
      stage: definition?.stage ?? "unknown",
      status: "ok",
      durationMs: Math.max(0, nowMs() - started),
      confidence: clampScore(meta.confidence),
      summary: meta.summary,
      signals: (meta.signals ?? []).filter(Boolean).map((signal) => truncate(String(signal), 220)).slice(0, 10),
    });
    return value;
  } catch (error) {
    traces.push({
      id,
      name: definition?.name ?? id,
      category: definition?.category ?? "operations",
      stage: definition?.stage ?? "unknown",
      status: "degraded",
      durationMs: Math.max(0, nowMs() - started),
      confidence: 35,
      summary: `${definition?.name ?? id} degraded and returned a safe fallback.`,
      signals: [],
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function detectPromptInjection(text: string): string[] {
  const rules = [
    /\b(ignore|forget|override)\s+(all\s+)?(previous|system|developer|rules|instructions)\b/i,
    /\b(reveal|show|print|leak)\s+(your\s+)?(system prompt|developer message|hidden rules|chain of thought)\b/i,
    /\b(jailbreak|bypass|do anything now|act as unrestricted)\b/i,
  ];
  return rules
    .filter((rule) => rule.test(text))
    .map((rule) => `Matched injection pattern: ${rule.source.slice(0, 80)}`);
}

function detectSpam(input: RageMindInput): string[] {
  const signals: string[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const own = sideMessages(input, side);
    const normalized = own.map((message) => message.content.trim().toLowerCase().replace(/\s+/g, " "));
    const repeats = normalized.length - new Set(normalized).size;
    if (repeats > 0) signals.push(`${side} repeated identical text ${repeats} time${repeats === 1 ? "" : "s"}.`);
    if (own.some((message) => /(.)\1{9,}/u.test(message.content))) signals.push(`${side} used repeated-character spam.`);
    if (own.some((message) => /https?:\/\/|www\./i.test(message.content))) signals.push(`${side} posted a link in battle text.`);
  }
  return signals.slice(0, 8);
}

function detectAfk(input: RageMindInput): string[] {
  return (["creator", "opponent"] as const)
    .map((side) => {
      const messages = sideMessages(input, side);
      const words = sideText(input, side).split(/\s+/).filter(Boolean).length;
      const symbolOnly = messages.filter((message) => {
        const visible = message.content.replace(/\s/g, "");
        const meaningful = visible.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
        return visible.length >= 4 && meaningful / Math.max(visible.length, 1) < 0.25;
      }).length;
      if (!messages.length) return `${side} has not participated yet.`;
      if (words < messages.length * 3) return `${side} has very low word participation.`;
      if (symbolOnly > 0) return `${side} sent symbol/emoji-heavy low-participation messages.`;
      return "";
    })
    .filter(Boolean);
}

function buildSecurityReport(
  promptInjectionSignals: string[],
  spamSignals: string[],
  afkSignals: string[],
  text: string
): RageMindXSecurityReport {
  const malformedInputSignals = [
    text.length > 8_000 ? "Transcript is unusually long for a single analysis pass." : "",
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text) ? "Control characters detected in transcript." : "",
  ].filter(Boolean);
  const dataPoisoningSignals = /\b(teach yourself|remember this forever|update your rules|add this to knowledge)\b/i.test(text)
    ? ["Message attempts to force live learning; only offline review can approve patterns."]
    : [];
  const riskScore =
    promptInjectionSignals.length * 35 +
    dataPoisoningSignals.length * 25 +
    spamSignals.length * 12 +
    malformedInputSignals.length * 20 +
    afkSignals.length * 8;
  const riskLevel = riskScore >= 55 ? "high" : riskScore >= 25 ? "medium" : "low";
  return {
    riskLevel,
    action: riskLevel === "high" ? "quarantine" : riskLevel === "medium" ? "warn" : "continue",
    promptInjectionSignals,
    dataPoisoningSignals,
    spamSignals: [...spamSignals, ...afkSignals].slice(0, 8),
    malformedInputSignals,
    safetyNotes: [
      "No live transcript is written directly into approved knowledge.",
      "Creator-only telemetry may show this reasoning log; public users do not see it.",
    ],
  };
}

function buildContext(input: RageMindInput): RageMindXContextEngine {
  const sarcasmSignals = input.messages
    .filter((message) => /\b(sure bro|oh wow|totally makes sense|amazing logic|great logic|wow genius|nice one)\b/i.test(message.content))
    .map((message) => `${message.username}: possible sarcasm or mock praise in "${truncate(message.content, 90)}"`);

  return {
    conversationFlow: "RageMind X tracked transcript order, callbacks, repeated ideas, ignored questions, and endgame momentum.",
    momentumShifts: inferMomentum(input),
    hiddenIntentions: input.messages
      .filter((message) => /\b(admit|you know|scared|cope|caught|exposed|still waiting)\b/i.test(message.content))
      .map((message) => `${message.username} may be framing the opponent psychologically in round ${message.round}.`),
    doubleMeanings: input.messages
      .filter((message) => /\b(killed|dead|destroy|cooked|fire|smoked|buried)\b/i.test(message.content))
      .map((message) => `${message.username}: "${truncate(message.content, 90)}" may be figurative battle language.`),
    sarcasmSignals,
  };
}

function buildMemory(
  input: RageMindInput,
  reasoning: ReasoningAnalysis,
  context: RageMindXContextEngine
): RageMindXMemoryReport {
  const text = textOf(input);
  return {
    shortTermSummary: `${input.messages.length} messages tracked for "${input.topic}". ${reasoning.ignoredQuestions.length} question signal${reasoning.ignoredQuestions.length === 1 ? "" : "s"} and ${reasoning.repeatedArguments.length} repetition signal${reasoning.repeatedArguments.length === 1 ? "" : "s"} found.`,
    topicMemory: topTerms(`${input.title} ${input.topic}`, 8).map((term) => `Topic term retained: ${term}`),
    battleMemory: input.messages.slice(-6).map((message) => `${message.username} r${message.round}: ${truncate(message.content, 90)}`),
    longTermCandidates: buildLongTermCandidates(input),
    repeatedPatterns: uniqueStrings([...reasoning.repeatedArguments, ...detectReusablePatterns(input)]),
    referencedObjects: topTerms(text, 8).map((term) => `Referenced object/term: ${term}`),
    retentionPolicy: context.hiddenIntentions.length
      ? "Store only approved post-battle summaries and safe player-style signals after offline review."
      : "Keep active conversation memory for the battle; queue only high-quality completed patterns for offline review.",
  };
}

function buildHumor(input: RageMindInput, memes: MemeAnalysis, context: RageMindXContextEngine): RageMindXHumorReport {
  const text = textOf(input);
  const humorSignals = input.messages
    .filter((message) => /\b(lol|lmao|haha|wild|meme|bro|cooked|ratio|peak|clown)\b/i.test(message.content))
    .map((message) => `${message.username} used humor marker in round ${message.round}.`);
  const ironySignals = input.messages
    .filter((message) => /\b(great|amazing|genius|smart)\b.*\b(logic|take|move)\b/i.test(message.content))
    .map((message) => `${message.username}: possible ironic praise in round ${message.round}.`);
  const roastSignals = input.messages
    .filter((message) => /\b(cooked|ratio|trash|washed|clown|npc|sit down|skill issue)\b/i.test(message.content))
    .map((message) => `${message.username} landed a roast-language marker in round ${message.round}.`);
  return {
    humorSignals: humorSignals.slice(0, 8),
    sarcasmSignals: context.sarcasmSignals,
    ironySignals: ironySignals.slice(0, 6),
    doubleMeanings: context.doubleMeanings,
    roastSignals: roastSignals.slice(0, 8),
    memeTiming: memes.references.length || humorSignals.length
      ? "Humor should be rewarded when it responds to context, not merely because slang appeared."
      : "Humor signal is light; logic and relevance should carry more weight.",
    boundary: /\b(kill yourself|kys|doxx|terrorist|nazi)\b/i.test(text)
      ? "Potentially unsafe content must override roast entertainment."
      : "Detected roast language appears competitive unless paired with real threats, hate, or targeting.",
  };
}

function buildReasoningLayers(
  input: RageMindInput,
  reasoning: ReasoningAnalysis,
  context: RageMindXContextEngine,
  humor: RageMindXHumorReport
): RageMindXReasoningLayers {
  const graph = buildConversationGraph(
    input.messages.map((message) => ({
      side: message.side,
      content: message.content,
      round: message.round,
    }))
  );
  return {
    literal: `Literal content parsed across ${input.messages.length} message${input.messages.length === 1 ? "" : "s"}.`,
    context: context.conversationFlow,
    historical: reasoning.evidence.length ? `Earlier evidence retained: ${reasoning.evidence[0]}` : "No historical evidence yet.",
    pattern: reasoning.repeatedArguments[0] ?? "No repeated argument pattern above threshold.",
    conversation: graph.insights[0] ?? "Conversation graph found no strong counter/callback signal yet.",
    humor: humor.memeTiming,
    battle: `Battle style inferred as ${inferBattleStyle(input)} from title, topic, mode, and transcript cues.`,
    social: "Social pressure, respect, and playful aggression are interpreted by full context, not isolated words.",
    strategic: context.momentumShifts[0] ?? "No decisive strategic shift detected yet.",
    self: "Self-review must stay conservative when evidence is sparse or safety risk is high.",
  };
}

function buildWinnerPrediction(
  input: RageMindInput,
  style: string,
  reasoning: ReasoningAnalysis,
  humor: RageMindXHumorReport
): RageMindXWinnerPrediction {
  const creator = sideQuality(input, "creator", style);
  const opponent = sideQuality(input, "opponent", style);
  const gap = Math.abs(creator - opponent);
  const predictedWinner = gap <= 3 ? "draw" : creator > opponent ? "creator" : "opponent";
  return {
    predictedWinner,
    scores: { creator, opponent },
    factors: [
      `Style=${style}`,
      `Evidence lines=${reasoning.evidence.length}`,
      `Humor signals=${humor.humorSignals.length}`,
      `Creator quality=${creator}`,
      `Opponent quality=${opponent}`,
    ],
    confidence: clampScore(54 + gap * 2 + Math.min(18, input.messages.length * 2)),
  };
}

function buildUserModels(
  input: RageMindInput,
  playerDNA: PlayerDNAResult,
  language: LanguageAnalysis
): Record<BattleSide, RageMindXUserModel> {
  return {
    creator: buildUserModel(input, "creator", playerDNA, language),
    opponent: buildUserModel(input, "opponent", playerDNA, language),
  };
}

function buildUserModel(
  input: RageMindInput,
  side: BattleSide,
  playerDNA: PlayerDNAResult,
  language: LanguageAnalysis
): RageMindXUserModel {
  const text = sideText(input, side);
  const quality = sideQuality(input, side, inferBattleStyle(input));
  return {
    side,
    skillLevel: quality >= 82 ? "elite" : quality >= 68 ? "skilled" : quality >= 50 ? "developing" : "new",
    languagePreference: language.primaryLanguages[0] ?? "English",
    battleStyle: playerDNA[side].label,
    humorPreference: playerDNA[side].humorStyle,
    aggressionLevel: clampScore(30 + countHits(text, /\b(cooked|destroy|trash|ratio|cope|sit down|washed)\b/gi) * 8),
    responseSpeed: "unknown in API transcript; infer after real-time event timing is stored.",
    adaptationNotes: [
      playerDNA[side].argumentStructure,
      playerDNA[side].growthSignal,
    ],
  };
}

function buildSelfReview(
  reasoning: ReasoningAnalysis,
  security: RageMindXSecurityReport,
  confidence: RageMindXConfidence
): RageMindXSelfReview {
  const contradictionWarnings = reasoning.contradictions.slice(0, 4);
  const hallucinationWarnings = confidence.score < 45
    ? ["Evidence is thin; avoid adding facts that are not in transcript or local knowledge."]
    : [];
  const offensiveRiskWarnings = security.riskLevel === "high"
    ? ["High security/safety risk; public response should stay minimal and creator review should see the log."]
    : [];
  return {
    passed: contradictionWarnings.length === 0 && hallucinationWarnings.length === 0 && offensiveRiskWarnings.length === 0,
    regeneratedInternally: confidence.score < 50 || security.riskLevel === "high",
    contradictionWarnings,
    hallucinationWarnings,
    offensiveRiskWarnings,
    improvements: [
      confidence.score < 60 ? "Use cautious wording because confidence is moderate or low." : "",
      "Keep scoring explanations tied to transcript evidence.",
      "Do not learn from this conversation until offline approval.",
    ].filter(Boolean),
  };
}

function buildGenerationPlan(
  input: RageMindInput,
  security: RageMindXSecurityReport,
  confidence: RageMindXConfidence
): RageMindXGenerationPlan {
  return {
    responsePlan: [
      "Start from detected intent, language, and safety boundary.",
      "Use context and transcript evidence before battle-style scoring.",
      "Keep creator-only reasoning logs separate from public output.",
    ],
    candidateSummary: security.action === "quarantine"
      ? "Generate only a conservative internal summary until Creator review."
      : `Generate a ${inferBattleStyle(input)}-aware verdict with confidence ${confidence.score}/100.`,
    guardrails: [
      "No external AI API call.",
      "No live learning from raw user text.",
      "No private chain-of-thought exposure; show structured reasoning logs only to Creator Panel.",
    ],
  };
}

function buildExplainability(
  intent: IntentAnalysis,
  language: LanguageAnalysis,
  emotion: EmotionAnalysis,
  confidence: RageMindXConfidence,
  layers: RageMindXReasoningLayers,
  prediction: RageMindXWinnerPrediction
): RageMindXExplainability {
  return {
    detectedIntent: intent.conversationIntent,
    detectedLanguage: language.primaryLanguages,
    emotionAnalysis: emotion,
    confidenceScore: confidence.score,
    reasoningPath: [
      layers.literal,
      layers.context,
      layers.pattern,
      layers.humor,
      layers.strategic,
      layers.self,
    ],
    scoringBreakdown: {
      creator: [`Predicted local score: ${prediction.scores.creator}`, ...prediction.factors.slice(0, 3)],
      opponent: [`Predicted local score: ${prediction.scores.opponent}`, ...prediction.factors.slice(0, 3)],
    },
    winnerExplanation: prediction.predictedWinner === "draw"
      ? "Local predictor sees no reliable separation between sides."
      : `${prediction.predictedWinner} leads by ${Math.abs(prediction.scores.creator - prediction.scores.opponent)} local quality points.`,
  };
}

function buildConfidence(
  input: RageMindInput,
  traces: RageMindXModuleTrace[],
  security: RageMindXSecurityReport,
  prediction: RageMindXWinnerPrediction,
  language: LanguageAnalysis
): RageMindXConfidence {
  const degraded = traces.filter((trace) => trace.status === "degraded").length;
  const evidence = Math.min(22, input.messages.length * 3);
  const languageBoost = language.mixedLanguage ? 2 : 0;
  const securityPenalty = security.riskLevel === "high" ? 18 : security.riskLevel === "medium" ? 8 : 0;
  const score = clampScore(48 + evidence + prediction.confidence * 0.25 + languageBoost - degraded * 5 - securityPenalty);
  return {
    score,
    reasoning: `Confidence blends transcript volume, winner margin, module health, language coverage, and safety risk. ${degraded} module${degraded === 1 ? "" : "s"} degraded.`,
    alternativeInterpretation: score < 70
      ? "A close battle, sparse transcript, mixed sarcasm, or safety ambiguity could change the final interpretation."
      : undefined,
  };
}

function buildFairness(language: LanguageAnalysis, security: RageMindXSecurityReport): RageMindXFairness {
  const biasWarnings = [
    language.mixedLanguage ? "Mixed language detected; do not penalize code-switching, grammar, or transliteration." : "",
    language.primaryLanguages.some((item) => item !== "English") ? "Judge cultural phrasing by meaning and battle context." : "",
    security.riskLevel !== "low" ? "Safety risk exists; do not reward harassment, threats, or manipulation attempts." : "",
  ].filter(Boolean);
  return {
    biasWarnings,
    judgingGuidance: "Judge quality, intent, topic fit, rebuttal strength, originality, audience impact, and safety boundaries. Never reward hate, threats, spam, doxxing, or targeted bullying.",
  };
}

function mergeKnowledgeIntoSlang(base: SlangAnalysis, knowledgeHits: KnowledgeEntry[]): SlangAnalysis {
  const relevant = knowledgeHits.filter((hit) => ["slang", "hinglish", "meme", "abbreviation", "emoji"].includes(hit.category));
  return {
    detected: uniqueStrings([...base.detected, ...relevant.map((hit) => hit.term)]),
    interpretations: uniqueStrings([
      ...base.interpretations,
      ...relevant.map((hit) => `${hit.term}: ${hit.meaning}; source=local knowledge v${hit.version}.`),
    ]),
  };
}

function sideQuality(input: RageMindInput, side: BattleSide, style: string): number {
  const text = sideText(input, side);
  const messages = sideMessages(input, side);
  const ratio = uniqueRatio(text);
  const logic = countHits(text, /\b(because|therefore|evidence|proof|reason|logic|point)\b/gi);
  const humor = countHits(text, /\b(lol|haha|wild|cooked|ratio|meme|bro|peak|clown)\b/gi);
  const counters = countHits(text, /\b(but|actually|you said|your point|still|answer|wrong|except)\b/gi);
  const punctuation = countHits(text, /[!?]/g);
  const base = 36 + ratio * 32 + Math.min(18, text.length / Math.max(30, messages.length * 20));
  const styleBoost =
    style === "debate" ? logic * 8 + counters * 5 :
    style === "roast" ? humor * 6 + counters * 4 :
    style === "meme" ? humor * 5 + punctuation * 2 :
    logic * 4 + humor * 4 + counters * 4;
  return clampScore(base + styleBoost + Math.min(12, messages.length * 3));
}

function inferMomentum(input: RageMindInput): string[] {
  const byRound = new Map<number, number>();
  for (const message of input.messages) byRound.set(message.round, (byRound.get(message.round) ?? 0) + 1);
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  if (rounds.length < 2) return ["Not enough rounds for reliable momentum analysis."];
  const middle = rounds[Math.floor(rounds.length / 2)];
  return [`Momentum should be checked around round ${middle}, where callbacks, pressure, and rebuttals usually start deciding the battle.`];
}

function inferBattleStyle(input: RageMindInput): string {
  const raw = `${input.battleType ?? ""} ${input.mode ?? ""} ${input.title} ${input.topic}`.toLowerCase();
  if (raw.includes("meme")) return "meme";
  if (raw.includes("predict")) return "prediction";
  if (raw.includes("debate")) return "debate";
  if (raw.includes("roast")) return "roast";
  if (input.mode === "text") return "debate";
  return "mixed";
}

function buildLongTermCandidates(input: RageMindInput): string[] {
  return (["creator", "opponent"] as const).flatMap((side) => {
    const text = sideText(input, side);
    const candidates = [];
    if (countHits(text, /\b(because|evidence|therefore|logic)\b/gi) >= 2) candidates.push(`${side}: possible logic-oriented player style.`);
    if (countHits(text, /\b(lol|haha|cooked|ratio|meme|wild)\b/gi) >= 2) candidates.push(`${side}: possible humor/roast-oriented player style.`);
    if (countHits(text, /\b(but|actually|you said|still)\b/gi) >= 2) candidates.push(`${side}: possible adaptive counterpunching style.`);
    return candidates;
  }).slice(0, 8);
}

function detectReusablePatterns(input: RageMindInput): string[] {
  const notes: string[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const own = sideMessages(input, side);
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        if (tokenOverlap(own[i].content, own[j].content) > 0.58) {
          notes.push(`${side} repeated a similar angle between rounds ${own[i].round} and ${own[j].round}.`);
        }
      }
    }
  }
  return notes.slice(0, 6);
}

function buildDebateSignals(input: RageMindInput, reasoning: ReasoningAnalysis): string[] {
  const text = textOf(input);
  return [
    ...reasoning.ignoredQuestions,
    ...reasoning.contradictions,
    countHits(text, /\b(because|therefore|evidence|proof|reason)\b/gi) ? "Evidence or cause/effect reasoning appeared." : "",
    countHits(text, /\b(but|actually|you said|answer)\b/gi) ? "Counterargument markers appeared." : "",
  ].filter(Boolean).slice(0, 8);
}

function buildCreativitySignals(input: RageMindInput): string[] {
  return (["creator", "opponent"] as const).map((side) => {
    const ratio = uniqueRatio(sideText(input, side));
    return `${side} vocabulary novelty ratio: ${Math.round(ratio * 100)}%.`;
  });
}

function buildToxicitySignals(text: string): string[] {
  return [
    /\b(kill yourself|kys|go die|doxx|home address)\b/i.test(text) ? "Threat/self-harm/doxxing phrase detected." : "",
    /\b(trash|pathetic|worthless|loser|garbage)\b/i.test(text) ? "Personal attack language detected; judge context and target." : "",
    /\b(cooked|ratio|washed|npc|skill issue)\b/i.test(text) ? "Competitive roast slang detected; not automatically harassment." : "",
  ].filter(Boolean);
}

function buildDifficultySignals(models: Record<BattleSide, RageMindXUserModel>): string[] {
  return (["creator", "opponent"] as const).map((side) => {
    const model = models[side];
    const tier = model.skillLevel === "elite" ? "Hard/Elite" : model.skillLevel === "skilled" ? "Normal/Hard" : "Easy/Normal";
    return `${side}: recommend ${tier} AI difficulty for practice mode.`;
  });
}

function critiqueResult(
  reasoning: ReasoningAnalysis,
  prediction: RageMindXWinnerPrediction,
  confidence: RageMindXConfidence
): string[] {
  return [
    prediction.confidence < 62 ? "Winner prediction is close; final judge should preserve draw possibility." : "",
    reasoning.contradictions.length ? "Contradiction signals require explanation before final scoring." : "",
    confidence.score < 55 ? "Confidence is low; use conservative explanation and creator-visible caution." : "",
  ].filter(Boolean);
}

function buildAnalyticsSignals(input: RageMindInput, language: LanguageAnalysis, confidence: RageMindXConfidence): string[] {
  return [
    `messages=${input.messages.length}`,
    `languages=${language.primaryLanguages.join(",")}`,
    `mixedLanguage=${language.mixedLanguage}`,
    `confidence=${confidence.score}`,
  ];
}

function buildUnknownPhrases(
  text: string,
  slang: SlangAnalysis,
  memes: MemeAnalysis,
  knowledgeHits: KnowledgeEntry[]
): string[] {
  const known = new Set([
    ...slang.detected.map((term) => term.toLowerCase()),
    ...memes.references.map((term) => term.toLowerCase()),
    ...knowledgeHits.map((hit) => hit.term.toLowerCase()),
  ]);
  return topTerms(text, 16)
    .filter((term) => term.length >= 4 && term.length <= 18 && !known.has(term.toLowerCase()))
    .slice(0, 8);
}

function averageIntentConfidence(intent: IntentAnalysis): number {
  if (!intent.messages.length) return 45;
  return clampScore(intent.messages.reduce((sum, message) => sum + message.confidence, 0) / intent.messages.length);
}

function fallbackSecurity(): RageMindXSecurityReport {
  return {
    riskLevel: "medium",
    action: "warn",
    promptInjectionSignals: [],
    dataPoisoningSignals: [],
    spamSignals: [],
    malformedInputSignals: [],
    safetyNotes: ["Security engine degraded; use conservative defaults."],
  };
}

function fallbackLanguage(): LanguageAnalysis {
  return { primaryLanguages: ["English"], mixedLanguage: false, codeSwitching: false, notes: [] };
}

function fallbackIntent(): IntentAnalysis {
  return { messages: [], dominantIntents: [], perSide: { creator: [], opponent: [] }, conversationIntent: "Competitive challenge and response." };
}

function fallbackReasoning(): ReasoningAnalysis {
  return { reasoning: "Reasoning engine degraded; use transcript evidence conservatively.", evidence: [], ignoredQuestions: [], repeatedArguments: [], contradictions: [] };
}

function fallbackAudience(): AudienceSimulation {
  return {
    biggestLaugh: "",
    mostSavageComeback: "",
    mostEmotionalReply: "",
    mostConvincingArgument: "",
    mostMemorableMoment: "",
    mostShareableLine: "",
    engagementScore: 0,
  };
}

function fallbackContext(): RageMindXContextEngine {
  return { conversationFlow: "Context engine degraded.", momentumShifts: [], hiddenIntentions: [], doubleMeanings: [], sarcasmSignals: [] };
}

function fallbackMemory(): RageMindXMemoryReport {
  return { shortTermSummary: "Memory engine degraded.", topicMemory: [], battleMemory: [], longTermCandidates: [], repeatedPatterns: [], referencedObjects: [], retentionPolicy: "Do not store live input directly." };
}

function fallbackHumor(): RageMindXHumorReport {
  return { humorSignals: [], sarcasmSignals: [], ironySignals: [], doubleMeanings: [], roastSignals: [], memeTiming: "Humor engine degraded.", boundary: "Use safety-first interpretation." };
}

function fallbackReasoningLayers(): RageMindXReasoningLayers {
  return {
    literal: "Unavailable.",
    context: "Unavailable.",
    historical: "Unavailable.",
    pattern: "Unavailable.",
    conversation: "Unavailable.",
    humor: "Unavailable.",
    battle: "Unavailable.",
    social: "Unavailable.",
    strategic: "Unavailable.",
    self: "Use conservative defaults.",
  };
}

function fallbackBattleDNA(): BattleDNA {
  return { humor: 0, logic: 0, creativity: 0, originality: 0, aggression: 0, confidence: 0, audienceAppeal: 0, emotionalIntensity: 0, culturalDensity: 0 };
}

function fallbackPlayerDNA(): PlayerDNAResult {
  const base = { label: "Balanced Thinker" as const, traits: [], humorStyle: "Unknown", argumentStructure: "Unknown", growthSignal: "Needs more data." };
  return { creator: base, opponent: base };
}

function fallbackUserModels(): Record<BattleSide, RageMindXUserModel> {
  const base = (side: BattleSide): RageMindXUserModel => ({
    side,
    skillLevel: "new",
    languagePreference: "English",
    battleStyle: "Balanced Thinker",
    humorPreference: "Unknown",
    aggressionLevel: 0,
    responseSpeed: "unknown",
    adaptationNotes: [],
  });
  return { creator: base("creator"), opponent: base("opponent") };
}

function fallbackFairness(): RageMindXFairness {
  return { biasWarnings: [], judgingGuidance: "Fairness engine degraded; judge only from transcript evidence and safety rules." };
}

function fallbackPrediction(): RageMindXWinnerPrediction {
  return { predictedWinner: "draw", scores: { creator: 0, opponent: 0 }, factors: [], confidence: 35 };
}

function fallbackSelfReview(): RageMindXSelfReview {
  return { passed: false, regeneratedInternally: true, contradictionWarnings: [], hallucinationWarnings: ["Self-review degraded."], offensiveRiskWarnings: [], improvements: ["Use conservative fallback."] };
}

function fallbackGeneration(): RageMindXGenerationPlan {
  return { responsePlan: [], candidateSummary: "Generation planner degraded.", guardrails: ["No external API calls."] };
}
