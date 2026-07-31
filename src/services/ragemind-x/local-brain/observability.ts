import type {
  BrainEmbeddingSet,
  BrainObservability,
  BrainResponse,
  BrainSafetyReport,
  BrainTrace,
  ModelAdapterCapabilities,
  RagReport,
  ReasoningReport,
  VectorMemoryReport,
} from "@/services/ragemind-x/local-brain/types";

export function buildObservability(input: {
  traces: BrainTrace[];
  reasoning: ReasoningReport;
  memory: VectorMemoryReport;
  retrieval: RagReport;
  response: BrainResponse;
  embeddings: BrainEmbeddingSet;
  model: ModelAdapterCapabilities;
  safety: BrainSafetyReport;
  startedAt: number;
}): BrainObservability {
  const latencyMs = Math.max(0, Date.now() - input.startedAt);
  const inputTokens = input.embeddings.statistics.tokenCount;
  const outputTokens = input.response.finalResponse.split(/\s+/).filter(Boolean).length;
  return {
    thinkingPipeline: input.traces.map((trace) => `${trace.stage}:${trace.status}`),
    reasoningGraph: input.reasoning.graph,
    memoryRetrieval: input.memory,
    retrievedKnowledge: input.retrieval.evidence,
    confidence: Math.min(input.response.confidence, input.reasoning.confidence),
    latencyMs,
    activeModules: input.traces.filter((trace) => trace.status === "ok").map((trace) => trace.id),
    tokenStatistics: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    embeddingStatistics: input.embeddings.statistics,
    inferenceSpeed: {
      tokensPerSecond: latencyMs > 0 ? round((outputTokens / latencyMs) * 1000) : outputTokens,
      adapterId: input.model.id,
      cpuFallback: !input.model.supportsGPU,
      gpuEnabled: input.model.supportsGPU,
    },
    memoryHits: input.memory.selected.length,
    criticCorrections: input.response.critic.corrections,
    learningQueue: {
      candidates: buildLearningCandidates(input),
      policy: "Store -> analyze -> filter -> human/admin approval -> extract -> validate -> brain update. Live user text is never trusted directly.",
    },
  };
}

export async function traceStage<T>(
  traces: BrainTrace[],
  id: string,
  stage: string,
  fallback: T,
  run: () => T | Promise<T>,
  summarize: (value: T) => { confidence: number; summary: string; signals?: string[] }
): Promise<T> {
  const started = Date.now();
  try {
    const value = await run();
    const meta = summarize(value);
    traces.push({
      id,
      stage,
      status: "ok",
      durationMs: Math.max(0, Date.now() - started),
      confidence: clamp(meta.confidence),
      summary: meta.summary,
      signals: (meta.signals ?? []).filter(Boolean).map((signal) => clip(signal, 220)).slice(0, 10),
    });
    return value;
  } catch (error) {
    traces.push({
      id,
      stage,
      status: "degraded",
      durationMs: Math.max(0, Date.now() - started),
      confidence: 30,
      summary: `${id} degraded; returned local fallback.`,
      signals: [],
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function buildLearningCandidates(input: {
  retrieval: RagReport;
  memory: VectorMemoryReport;
  response: BrainResponse;
  safety: BrainSafetyReport;
}): string[] {
  if (input.safety.riskLevel === "high") return ["Rejected for automatic learning: high safety risk."];
  return [
    ...input.memory.clusters.map((cluster) => `Topic cluster candidate: ${cluster.topic}`),
    ...input.retrieval.evidence.map((item) => `Knowledge usage candidate: ${item.id}`),
    ...input.response.critic.corrections.map((correction) => `Critic correction candidate: ${correction}`),
  ].slice(0, 8);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
