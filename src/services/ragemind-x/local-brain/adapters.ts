import { embedText } from "@/services/ragemind-x/local-brain/embeddings";
import type {
  BrainEmbedding,
  EmbeddingKind,
  ModelAdapter,
  ModelAdapterGenerateInput,
  ModelAdapterGenerateOutput,
} from "@/services/ragemind-x/local-brain/types";

class LocalHeuristicModelAdapter implements ModelAdapter {
  capabilities = {
    id: "local-heuristic-v1",
    name: "Local Heuristic Generator",
    localOnly: true as const,
    supportsGeneration: true,
    supportsEmbeddings: true,
    supportsStreaming: true,
    supportsGPU: false,
    supportsQuantization: false,
    contextWindow: 8192,
  };

  async generate(input: ModelAdapterGenerateInput): Promise<ModelAdapterGenerateOutput> {
    const started = Date.now();
    const text = buildDeterministicReply(input);
    return {
      text,
      tokens: text.split(/\s+/).filter(Boolean).length,
      latencyMs: Date.now() - started,
      modelId: this.capabilities.id,
    };
  }

  async *stream(input: ModelAdapterGenerateInput): AsyncGenerator<string> {
    const output = await this.generate(input);
    for (const chunk of chunkText(output.text, 18)) {
      yield chunk;
    }
  }

  async embed(input: string, kind: EmbeddingKind = "document"): Promise<BrainEmbedding> {
    return embedText(input, kind);
  }
}

const adapters = new Map<string, ModelAdapter>();
const defaultAdapter = new LocalHeuristicModelAdapter();
adapters.set(defaultAdapter.capabilities.id, defaultAdapter);

export function registerLocalModelAdapter(adapter: ModelAdapter) {
  if (!adapter.capabilities.localOnly) {
    throw new Error("RageMind X only accepts local model adapters.");
  }
  adapters.set(adapter.capabilities.id, adapter);
}

export function getLocalModelAdapter(id?: string): ModelAdapter {
  return (id ? adapters.get(id) : null) ?? defaultAdapter;
}

export function listLocalModelAdapters() {
  return [...adapters.values()].map((adapter) => adapter.capabilities);
}

function buildDeterministicReply(input: ModelAdapterGenerateInput): string {
  const context = input.context;
  const plan = context?.response.plan;
  const evidence = context?.retrieval.evidence.slice(0, 2).map((item) => item.title).join(", ");
  const memory = context?.memory.compressedSummary;
  const safety = context?.safety.action === "quarantine"
    ? "I need to keep this conservative because the input tripped safety checks."
    : "";
  const language = plan?.language ?? "English";
  const tone = plan?.tone ?? "clear";
  const strategy = plan?.battleStrategy ?? "answer directly";
  const main = input.prompt.trim().replace(/\s+/g, " ").slice(0, 220);

  return [
    safety,
    `Here is the local ${tone} read in ${language}: ${main || "the strongest answer is to stay relevant, specific, and grounded."}`,
    evidence ? `Local evidence: ${evidence}.` : "",
    memory && memory !== "No relevant memory selected." ? `Memory context: ${memory}` : "",
    `Strategy: ${strategy}.`,
  ].filter(Boolean).join(" ");
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  return chunks.length ? chunks : [text];
}
