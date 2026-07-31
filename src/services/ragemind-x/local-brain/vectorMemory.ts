import { averageEmbeddings, cosineSimilarity, embedText, normalizeTokens, topEmbeddingDimensions } from "@/services/ragemind-x/local-brain/embeddings";
import type {
  BrainEmbedding,
  LocalBrainRequest,
  VectorMemoryItem,
  VectorMemoryReport,
  VectorMemorySearchResult,
} from "@/services/ragemind-x/local-brain/types";

export interface VectorMemorySearchOptions {
  limit?: number;
  minScore?: number;
  scopes?: VectorMemoryItem["scope"][];
  now?: string;
  approximate?: boolean;
}

export class LocalVectorMemory {
  private items = new Map<string, VectorMemoryItem>();
  private buckets = new Map<string, Set<string>>();
  private dimensions: number;

  constructor(items: VectorMemoryItem[] = [], dimensions = 256) {
    this.dimensions = dimensions;
    for (const item of items) this.upsert(item);
  }

  upsert(item: VectorMemoryItem): VectorMemoryItem {
    const embedding = item.embedding ?? embedText(item.content, "long-context", this.dimensions).vector;
    const normalized: VectorMemoryItem = {
      ...item,
      embedding,
      topics: item.topics.length ? item.topics : inferTopics(item.content),
      updatedAt: item.updatedAt ?? item.createdAt,
    };
    this.items.set(item.id, normalized);
    this.indexItem(normalized);
    return normalized;
  }

  add(content: string, partial: Partial<VectorMemoryItem> = {}): VectorMemoryItem {
    return this.upsert({
      id: partial.id ?? `mem_${stableId(content)}`,
      scope: partial.scope ?? "working",
      ownerId: partial.ownerId,
      sourceId: partial.sourceId,
      content,
      summary: partial.summary,
      topics: partial.topics ?? inferTopics(content),
      importance: clamp(partial.importance ?? 50),
      confidence: clamp(partial.confidence ?? 70),
      createdAt: partial.createdAt ?? new Date().toISOString(),
      updatedAt: partial.updatedAt,
      expiresAt: partial.expiresAt,
      metadata: partial.metadata,
      embedding: partial.embedding,
    });
  }

  search(query: string | BrainEmbedding, options: VectorMemorySearchOptions = {}): VectorMemorySearchResult[] {
    const queryVector = typeof query === "string" ? embedText(query, "context", this.dimensions).vector : query.vector;
    const now = new Date(options.now ?? Date.now());
    const candidates = options.approximate ? this.approximateCandidates(queryVector) : [...this.items.values()];
    const scopes = options.scopes ? new Set(options.scopes) : null;
    const seen = new Map<string, string>();

    return candidates
      .filter((item) => !scopes || scopes.has(item.scope))
      .filter((item) => !isExpired(item, now))
      .map((item) => {
        const semanticScore = item.embedding ? cosineSimilarity(queryVector, item.embedding) : 0;
        const recencyScore = scoreRecency(item, now);
        const importanceScore = item.importance / 100;
        const duplicateKey = duplicateKeyFor(item.content);
        const duplicateOf = seen.get(duplicateKey);
        if (!duplicateOf) seen.set(duplicateKey, item.id);
        const score = semanticScore * 0.62 + recencyScore * 0.16 + importanceScore * 0.22;
        return {
          item,
          score: round(score),
          semanticScore: round(semanticScore),
          recencyScore: round(recencyScore),
          importanceScore: round(importanceScore),
          duplicateOf,
        };
      })
      .filter((result) => result.score >= (options.minScore ?? 0.12))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 8);
  }

  report(query: string, options: VectorMemorySearchOptions = {}): VectorMemoryReport {
    const now = new Date(options.now ?? Date.now());
    const selected = this.search(query, { ...options, approximate: options.approximate ?? true });
    const expiredIds = [...this.items.values()].filter((item) => isExpired(item, now)).map((item) => item.id);
    const duplicateIds = selected.filter((result) => result.duplicateOf).map((result) => result.item.id);
    const clusters = clusterMemories([...this.items.values()].filter((item) => !isExpired(item, now)), this.dimensions);
    return {
      selected,
      clusters,
      compressedSummary: compressMemories(selected.map((result) => result.item)),
      expiredIds,
      duplicateIds,
      indexStats: {
        items: this.items.size,
        buckets: this.buckets.size,
        approximate: options.approximate ?? true,
        dimensions: this.dimensions,
      },
    };
  }

  all(): VectorMemoryItem[] {
    return [...this.items.values()];
  }

  private indexItem(item: VectorMemoryItem) {
    for (const key of bucketKeys(item.embedding ?? [])) {
      const bucket = this.buckets.get(key) ?? new Set<string>();
      bucket.add(item.id);
      this.buckets.set(key, bucket);
    }
  }

  private approximateCandidates(queryVector: number[]): VectorMemoryItem[] {
    const ids = new Set<string>();
    for (const key of bucketKeys(queryVector)) {
      for (const id of this.buckets.get(key) ?? []) ids.add(id);
    }
    if (!ids.size) return [...this.items.values()];
    return [...ids].map((id) => this.items.get(id)).filter(Boolean) as VectorMemoryItem[];
  }
}

export function buildVectorMemoryReport(request: LocalBrainRequest, query: string): VectorMemoryReport {
  const memory = new LocalVectorMemory(request.memories ?? []);
  for (const message of request.messages.slice(-8)) {
    memory.add(message.content, {
      id: `msg_${stableId(`${message.role}:${message.round ?? ""}:${message.content}`)}`,
      scope: message.role === "user" ? "working" : "short",
      ownerId: message.userId ?? request.userId,
      sourceId: request.conversationId,
      importance: message.content.length > 120 ? 68 : 48,
      confidence: 72,
      createdAt: message.createdAt ?? new Date().toISOString(),
      metadata: { role: message.role, round: message.round },
    });
  }
  return memory.report(query, {
    limit: request.options?.maxRetrievedMemories ?? 6,
    now: request.options?.now,
    approximate: true,
  });
}

export function compressMemories(items: VectorMemoryItem[]): string {
  if (!items.length) return "No relevant memory selected.";
  const topics = [...new Set(items.flatMap((item) => item.topics))].slice(0, 6);
  const important = [...items].sort((a, b) => b.importance - a.importance).slice(0, 3);
  return [
    `Selected ${items.length} memory item${items.length === 1 ? "" : "s"}.`,
    topics.length ? `Topics: ${topics.join(", ")}.` : "",
    ...important.map((item) => item.summary ?? clip(item.content, 120)),
  ].filter(Boolean).join(" ");
}

export function clusterMemories(items: VectorMemoryItem[], dimensions = 256): VectorMemoryReport["clusters"] {
  const byTopic = new Map<string, VectorMemoryItem[]>();
  for (const item of items) {
    for (const topic of item.topics.slice(0, 3)) {
      const list = byTopic.get(topic) ?? [];
      list.push(item);
      byTopic.set(topic, list);
    }
  }
  return [...byTopic.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([topic, topicItems]) => ({
      topic,
      memoryIds: topicItems.map((item) => item.id).slice(0, 12),
      centroid: averageEmbeddings(topicItems.map((item) => item.embedding ?? embedText(item.content, "topic", dimensions).vector), dimensions),
    }));
}

export function inferTopics(text: string): string[] {
  const counts = new Map<string, number>();
  for (const token of normalizeTokens(text)) {
    if (STOP_TOPICS.has(token) || token.length < 3) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([topic]) => topic);
}

function bucketKeys(vector: number[]): string[] {
  return topEmbeddingDimensions(vector, 6).map((item) => `${item.index}:${item.value >= 0 ? "p" : "n"}`);
}

function isExpired(item: VectorMemoryItem, now: Date): boolean {
  return Boolean(item.expiresAt && new Date(item.expiresAt).getTime() <= now.getTime());
}

function scoreRecency(item: VectorMemoryItem, now: Date): number {
  const then = new Date(item.updatedAt ?? item.createdAt).getTime();
  if (!Number.isFinite(then)) return 0.4;
  const ageHours = Math.max(0, now.getTime() - then) / 3_600_000;
  return 1 / (1 + ageHours / 72);
}

function duplicateKeyFor(content: string): string {
  return normalizeTokens(content).slice(0, 18).join(" ");
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const STOP_TOPICS = new Set([
  "the",
  "and",
  "you",
  "your",
  "that",
  "this",
  "with",
  "for",
  "but",
  "are",
  "was",
  "were",
  "hai",
  "bro",
  "bhai",
  "lol",
]);
