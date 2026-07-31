import type {
  BrainEmbedding,
  BrainEmbeddingSet,
  EmbeddingKind,
  NlpAnalysis,
} from "@/services/ragemind-x/local-brain/types";

const DEFAULT_DIMENSIONS = 256;

const KIND_BOOSTS: Record<EmbeddingKind, RegExp[]> = {
  sentence: [/\b(is|are|was|were|because|but|so)\b/i],
  document: [/\b(topic|context|overall|summary|conversation)\b/i],
  context: [/\b(previous|earlier|callback|reply|round|said)\b/i],
  topic: [/\b(topic|about|theme|subject|domain)\b/i],
  conversation: [/\b(you|i|we|reply|answer|asked|said)\b/i],
  emotion: [/\b(angry|happy|sad|frustrated|excited|respect|fear|confidence|cry|mad)\b/i],
  humor: [/\b(lol|lmao|haha|joke|meme|funny|wild|brainrot|callback)\b/i],
  roast: [/\b(cooked|ratio|trash|clown|washed|mid|npc|skill issue|roast)\b/i],
  knowledge: [/\b(rule|fact|source|evidence|mechanic|faq|documentation|history)\b/i],
  intent: [/\b(want|need|ask|tell|show|prove|explain|command|question)\b/i],
  "long-context": [/\b(earlier|later|meanwhile|before|after|timeline|memory|summary)\b/i],
};

export function buildEmbeddingSet(nlp: NlpAnalysis): BrainEmbeddingSet {
  const kinds: EmbeddingKind[] = [
    "sentence",
    "document",
    "context",
    "topic",
    "conversation",
    "emotion",
    "humor",
    "roast",
    "knowledge",
    "intent",
    "long-context",
  ];
  const embeddings = Object.fromEntries(
    kinds.map((kind) => [kind, embedText(nlp.normalizedText, kind, DEFAULT_DIMENSIONS)])
  ) as Record<EmbeddingKind, BrainEmbedding>;
  const nonZeroDimensions = new Set<number>();
  for (const embedding of Object.values(embeddings)) {
    embedding.vector.forEach((value, index) => {
      if (value !== 0) nonZeroDimensions.add(index);
    });
  }
  return {
    embeddings,
    statistics: {
      dimensions: DEFAULT_DIMENSIONS,
      tokenCount: nlp.tokens.length,
      nonZeroDimensions: nonZeroDimensions.size,
      averageMagnitude: round(
        Object.values(embeddings).reduce((sum, embedding) => sum + embedding.magnitude, 0) /
          Math.max(Object.keys(embeddings).length, 1)
      ),
      generatedLocally: true,
    },
  };
}

export function embedText(text: string, kind: EmbeddingKind = "document", dimensions = DEFAULT_DIMENSIONS): BrainEmbedding {
  const vector = new Array(dimensions).fill(0);
  const tokens = normalizeTokens(text);
  for (const token of tokens) {
    addFeature(vector, token, 1);
    for (const gram of charNgrams(token)) addFeature(vector, gram, 0.35);
  }
  for (const phrase of phraseWindows(tokens, 2)) addFeature(vector, phrase, 0.6);
  for (const phrase of phraseWindows(tokens, 3)) addFeature(vector, phrase, 0.4);
  for (const pattern of KIND_BOOSTS[kind]) {
    if (pattern.test(text)) addFeature(vector, `kind:${kind}:${pattern.source}`, 1.8);
  }
  normalizeVector(vector);
  return {
    kind,
    dimensions,
    vector,
    tokens: tokens.length,
    magnitude: round(Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))),
  };
}

export function averageEmbeddings(embeddings: number[][], dimensions = DEFAULT_DIMENSIONS): number[] {
  const vector = new Array(dimensions).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < Math.min(dimensions, embedding.length); i++) vector[i] += embedding[i];
  }
  if (embeddings.length) {
    for (let i = 0; i < vector.length; i++) vector[i] /= embeddings.length;
  }
  normalizeVector(vector);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (!aMag || !bMag) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

export function topEmbeddingDimensions(vector: number[], limit = 8): { index: number; value: number }[] {
  return vector
    .map((value, index) => ({ index, value }))
    .filter((item) => item.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

export function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#@-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .slice(0, 4096);
}

function addFeature(vector: number[], feature: string, weight: number) {
  const hash = fnv1a(feature);
  const index = hash % vector.length;
  const sign = hash & 1 ? 1 : -1;
  vector[index] += sign * weight;
}

function charNgrams(token: string): string[] {
  if (token.length <= 3) return [token];
  const grams: string[] = [];
  for (let size = 3; size <= Math.min(5, token.length); size++) {
    for (let i = 0; i <= token.length - size; i++) grams.push(token.slice(i, i + size));
  }
  return grams;
}

function phraseWindows(tokens: string[], size: number): string[] {
  const phrases: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) phrases.push(tokens.slice(i, i + size).join("_"));
  return phrases.slice(0, 512);
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return;
  for (let i = 0; i < vector.length; i++) vector[i] = round(vector[i] / magnitude, 6);
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function round(value: number, places = 4): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
