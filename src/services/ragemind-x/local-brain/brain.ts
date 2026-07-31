import { getLocalModelAdapter } from "@/services/ragemind-x/local-brain/adapters";
import { buildEmbeddingSet } from "@/services/ragemind-x/local-brain/embeddings";
import { retrieveKnowledge } from "@/services/ragemind-x/local-brain/knowledgeRetrieval";
import { analyzeNlp } from "@/services/ragemind-x/local-brain/nlp";
import { buildObservability, traceStage } from "@/services/ragemind-x/local-brain/observability";
import { resolvePersonality } from "@/services/ragemind-x/local-brain/personality";
import { buildBrainResponse } from "@/services/ragemind-x/local-brain/planner";
import { buildReasoningReport } from "@/services/ragemind-x/local-brain/reasoning";
import { runBrainSafety } from "@/services/ragemind-x/local-brain/safety";
import { buildVectorMemoryReport } from "@/services/ragemind-x/local-brain/vectorMemory";
import {
  LOCAL_BRAIN_VERSION,
  type BrainTrace,
  type LocalBrainRequest,
  type LocalBrainResult,
} from "@/services/ragemind-x/local-brain/types";
import type { RageMindInput } from "@/services/rageMind";

export async function runLocalBrain(request: LocalBrainRequest): Promise<LocalBrainResult> {
  const startedAt = Date.now();
  const traces: BrainTrace[] = [];
  const adapter = getLocalModelAdapter();
  const safeRequest = normalizeRequest(request);

  const fallbackNlp = analyzeNlp({ ...safeRequest, messages: [] });
  const nlp = await traceStage(
    traces,
    "nlp-foundation",
    "foundation",
    fallbackNlp,
    () => analyzeNlp(safeRequest),
    (value) => ({
      confidence: value.languageConfidence,
      summary: `Parsed ${value.tokens.length} tokens across ${value.sentences.length} sentences.`,
      signals: [
        `languages=${value.languages.map((language) => language.language).join(",")}`,
        `codeSwitching=${value.codeSwitching}`,
        `conversationType=${value.conversationType}`,
      ],
    })
  );

  const safety = await traceStage(
    traces,
    "safety-engine",
    "security",
    runBrainSafety({ ...safeRequest, messages: [] }, fallbackNlp),
    () => runBrainSafety(safeRequest, nlp),
    (value) => ({
      confidence: value.riskLevel === "high" ? 88 : value.riskLevel === "medium" ? 74 : 82,
      summary: `Safety action=${value.action}; risk=${value.riskLevel}.`,
      signals: [
        ...value.promptInjectionSignals,
        ...value.contextPoisoningSignals,
        ...value.memoryPoisoningSignals,
        ...value.abuseSignals,
      ],
    })
  );

  const embeddings = await traceStage(
    traces,
    "embedding-engine",
    "semantic-understanding",
    buildEmbeddingSet(fallbackNlp),
    () => buildEmbeddingSet(nlp),
    (value) => ({
      confidence: value.statistics.nonZeroDimensions ? 82 : 44,
      summary: `Generated ${Object.keys(value.embeddings).length} local embedding families.`,
      signals: [
        `dimensions=${value.statistics.dimensions}`,
        `tokens=${value.statistics.tokenCount}`,
        `nonZero=${value.statistics.nonZeroDimensions}`,
      ],
    })
  );

  const query = buildQuery(safeRequest, nlp.normalizedText);
  const memory = await traceStage(
    traces,
    "vector-memory",
    "memory",
    buildVectorMemoryReport({ ...safeRequest, memories: [] }, query),
    () => buildVectorMemoryReport(safeRequest, query),
    (value) => ({
      confidence: value.selected.length ? 78 : 58,
      summary: `Selected ${value.selected.length} relevant memories from ${value.indexStats.items} indexed items.`,
      signals: [
        `clusters=${value.clusters.length}`,
        `duplicates=${value.duplicateIds.length}`,
        `expired=${value.expiredIds.length}`,
      ],
    })
  );

  const retrieval = await traceStage(
    traces,
    "offline-rag",
    "knowledge-retrieval",
    retrieveKnowledge({ ...safeRequest, knowledgePacks: [] }, nlp),
    () => retrieveKnowledge(safeRequest, nlp),
    (value) => ({
      confidence: value.confidence,
      summary: `Retrieved ${value.evidence.length} local evidence item${value.evidence.length === 1 ? "" : "s"}.`,
      signals: [...value.rankingSignals, ...value.citations],
    })
  );

  const reasoning = await traceStage(
    traces,
    "reasoning-engine",
    "reasoning",
    buildReasoningReport({ nlp, retrieval, memory, safety, topic: safeRequest.topic }),
    () => buildReasoningReport({ nlp, retrieval, memory, safety, topic: safeRequest.topic }),
    (value) => ({
      confidence: value.confidence,
      summary: `Reasoning graph has ${value.graph.nodes.length} nodes and ${value.graph.edges.length} edges.`,
      signals: [
        ...value.logical,
        ...value.debate,
        ...value.selfConsistency.warnings,
      ].slice(0, 8),
    })
  );

  const personality = resolvePersonality(safeRequest.personalityId, safeRequest.personality);
  const response = await traceStage(
    traces,
    "response-planner-critic",
    "response-planning",
    fallbackLocalBrainResult(safeRequest).response,
    () => buildBrainResponse({ request: safeRequest, nlp, safety, memory, retrieval, reasoning, personality, adapter }),
    (value) => ({
      confidence: value.confidence,
      summary: `Planned, drafted, critiqued, and finalized a local response.`,
      signals: [
        `tone=${value.plan.tone}`,
        `strategy=${value.plan.battleStrategy}`,
        `criticCorrections=${value.critic.corrections.length}`,
      ],
    })
  );

  const resultWithoutObservability = {
    version: LOCAL_BRAIN_VERSION,
    model: adapter.capabilities,
    input: {
      conversationId: safeRequest.conversationId,
      messageCount: safeRequest.messages.length,
      topic: safeRequest.topic,
      title: safeRequest.title,
    },
    safety,
    nlp,
    embeddings,
    memory,
    retrieval,
    reasoning,
    response,
    observability: undefined,
    traces,
    generatedAt: new Date().toISOString(),
  } as unknown as LocalBrainResult;

  resultWithoutObservability.observability = buildObservability({
    traces,
    reasoning,
    memory,
    retrieval,
    response,
    embeddings,
    model: adapter.capabilities,
    safety,
    startedAt,
  });

  traces.push({
    id: "observability",
    stage: "operations",
    status: "ok",
    durationMs: Math.max(0, Date.now() - startedAt - resultWithoutObservability.observability.latencyMs),
    confidence: resultWithoutObservability.observability.confidence,
    summary: "Creator observability payload assembled.",
    signals: [
      `latencyMs=${resultWithoutObservability.observability.latencyMs}`,
      `memoryHits=${resultWithoutObservability.observability.memoryHits}`,
      `tokenTotal=${resultWithoutObservability.observability.tokenStatistics.totalTokens}`,
    ],
  });

  return resultWithoutObservability;
}

export async function runLocalBrainForRageMind(input: RageMindInput): Promise<LocalBrainResult> {
  return runLocalBrain({
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
    generation: {
      objective: "produce local conversational intelligence signals for RageMind X battle analysis",
      tone: "competitive, fair, and explainable",
      maxTokens: 180,
    },
    options: {
      maxRetrievedKnowledge: 6,
      maxRetrievedMemories: 6,
      enableLearningCandidates: true,
    },
  });
}

export async function* streamLocalBrainResponse(request: LocalBrainRequest): AsyncGenerator<string> {
  const result = await runLocalBrain({ ...request, generation: { ...request.generation, stream: true } });
  for (const chunk of result.response.streamableChunks) {
    yield chunk;
  }
}

export function fallbackLocalBrainResult(request: Partial<LocalBrainRequest> = {}): LocalBrainResult {
  const adapter = getLocalModelAdapter();
  const fallbackRequest = normalizeRequest({
    ...request,
    messages: request.messages?.length ? request.messages : [{ role: "user", content: "" }],
  } as LocalBrainRequest);
  const nlp = analyzeNlp(fallbackRequest);
  const safety = runBrainSafety(fallbackRequest, nlp);
  const embeddings = buildEmbeddingSet(nlp);
  const memory = buildVectorMemoryReport({ ...fallbackRequest, memories: [] }, "");
  const retrieval = retrieveKnowledge({ ...fallbackRequest, knowledgePacks: [] }, nlp);
  const reasoning = buildReasoningReport({ nlp, retrieval, memory, safety, topic: fallbackRequest.topic });
  const response = {
    plan: {
      tone: "conservative",
      length: "short" as const,
      humor: 0,
      confidence: 35,
      aggression: 0,
      creativity: 20,
      language: "English",
      emojiUsage: 0,
      battleStrategy: "safe fallback",
      internalSteps: ["Use fallback because a brain stage degraded."],
      draftGoals: ["Avoid unsupported claims."],
    },
    draft: "Local brain fallback is active.",
    critic: {
      hallucinationWarnings: ["Fallback mode cannot support new factual claims."],
      contradictionWarnings: [],
      grammarWarnings: [],
      contextWarnings: [],
      biasWarnings: [],
      logicWarnings: [],
      relevanceWarnings: [],
      safetyWarnings: [],
      confidence: 35,
      rewriteRequired: false,
      corrections: [],
    },
    improvedDraft: "Local brain fallback is active.",
    finalResponse: "Local brain fallback is active.",
    streamableChunks: ["Local brain fallback is active."],
    confidence: 35,
  };
  const traces: BrainTrace[] = [{
    id: "fallback",
    stage: "operations",
    status: "degraded",
    durationMs: 0,
    confidence: 35,
    summary: "Safe fallback local brain result.",
    signals: ["externalInference=false"],
  }];
  return {
    version: LOCAL_BRAIN_VERSION,
    model: adapter.capabilities,
    input: {
      conversationId: fallbackRequest.conversationId,
      messageCount: fallbackRequest.messages.length,
      topic: fallbackRequest.topic,
      title: fallbackRequest.title,
    },
    safety,
    nlp,
    embeddings,
    memory,
    retrieval,
    reasoning,
    response,
    observability: buildObservability({
      traces,
      reasoning,
      memory,
      retrieval,
      response,
      embeddings,
      model: adapter.capabilities,
      safety,
      startedAt: Date.now(),
    }),
    traces,
    generatedAt: new Date().toISOString(),
  };
}

function normalizeRequest(request: LocalBrainRequest): LocalBrainRequest {
  return {
    ...request,
    messages: (request.messages ?? [])
      .filter((message) => typeof message.content === "string")
      .map((message) => ({ ...message, content: message.content.slice(0, 8_000) })),
    options: {
      maxRetrievedKnowledge: 6,
      maxRetrievedMemories: 6,
      enableLearningCandidates: false,
      ...request.options,
    },
  };
}

function buildQuery(request: LocalBrainRequest, text: string): string {
  return [
    request.title,
    request.topic,
    request.generation?.objective,
    request.messages.slice(-4).map((message) => message.content).join(" "),
    text.slice(0, 600),
  ].filter(Boolean).join(" ");
}
