export const LOCAL_BRAIN_VERSION = "local-brain-v1.0.0";

export type BrainMessageRole = "system" | "user" | "assistant" | "creator" | "opponent";

export interface BrainMessage {
  role: BrainMessageRole;
  content: string;
  userId?: string;
  username?: string;
  round?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BrainKnowledgeEntry {
  id: string;
  title: string;
  body: string;
  category: string;
  language?: string;
  tags?: string[];
  source?: string;
  version?: string | number;
  confidence?: number;
}

export interface BrainKnowledgePack {
  id: string;
  name: string;
  description?: string;
  version: string | number;
  entries: BrainKnowledgeEntry[];
}

export interface BrainPersonalityConfig {
  id: string;
  name: string;
  vocabulary: string[];
  tone: string;
  humor: number;
  aggression: number;
  creativity: number;
  emojiFrequency: number;
  reasoningStyle: string;
  responseSpeed: "slow" | "balanced" | "fast";
  knowledgeBias?: string[];
}

export interface LocalBrainRequest {
  conversationId?: string;
  userId?: string;
  title?: string;
  topic?: string;
  mode?: string;
  locale?: string;
  personalityId?: string;
  personality?: Partial<BrainPersonalityConfig>;
  messages: BrainMessage[];
  knowledgePacks?: BrainKnowledgePack[];
  memories?: VectorMemoryItem[];
  generation?: {
    objective?: string;
    tone?: string;
    maxTokens?: number;
    stream?: boolean;
  };
  options?: {
    maxRetrievedMemories?: number;
    maxRetrievedKnowledge?: number;
    enableLearningCandidates?: boolean;
    now?: string;
  };
}

export interface BrainTrace {
  id: string;
  stage: string;
  status: "ok" | "degraded" | "skipped";
  durationMs: number;
  confidence: number;
  summary: string;
  signals: string[];
  error?: string;
}

export interface BrainToken {
  index: number;
  value: string;
  normalized: string;
  kind: "word" | "number" | "emoji" | "punctuation" | "symbol";
  start: number;
  end: number;
  subwords: string[];
}

export interface BrainSentence {
  index: number;
  text: string;
  start: number;
  end: number;
  tokens: BrainToken[];
}

export interface BrainCharacterSignal {
  char: string;
  codePoint: string;
  kind: "letter" | "number" | "mark" | "emoji" | "punctuation" | "space" | "symbol";
}

export interface BrainLanguageScore {
  language: string;
  confidence: number;
  evidence: string[];
}

export interface BrainSyntaxNode {
  id: string;
  label: string;
  text: string;
  children: BrainSyntaxNode[];
}

export interface BrainDependencyEdge {
  head: string;
  dependent: string;
  relation: string;
  confidence: number;
}

export interface BrainEntity {
  text: string;
  type: "person" | "place" | "organization" | "topic" | "number" | "handle" | "hashtag" | "unknown";
  startToken: number;
  endToken: number;
  confidence: number;
}

export interface BrainCoreference {
  pronoun: string;
  referent: string;
  sentenceIndex: number;
  confidence: number;
}

export interface BrainPhraseChunk {
  text: string;
  kind: "noun" | "verb" | "adjective" | "emoji" | "mixed";
  tokenIndexes: number[];
}

export interface BrainIntentSignal {
  label:
    | "question"
    | "command"
    | "debate"
    | "roast"
    | "humor"
    | "support"
    | "explain"
    | "challenge"
    | "story"
    | "unknown";
  confidence: number;
  evidence: string[];
}

export interface NlpAnalysis {
  normalizedText: string;
  sentences: BrainSentence[];
  tokens: BrainToken[];
  characters: BrainCharacterSignal[];
  emoji: BrainToken[];
  punctuation: BrainToken[];
  languages: BrainLanguageScore[];
  codeSwitching: boolean;
  romanizedIndianLanguage: boolean;
  posTags: { token: string; tag: string; confidence: number }[];
  syntaxTree: BrainSyntaxNode;
  dependencies: BrainDependencyEdge[];
  entities: BrainEntity[];
  coreferences: BrainCoreference[];
  phrases: BrainPhraseChunk[];
  intents: BrainIntentSignal[];
  questionDetected: boolean;
  commandDetected: boolean;
  conversationType: "battle" | "support" | "planning" | "casual" | "qa" | "unknown";
  languageConfidence: number;
}

export type EmbeddingKind =
  | "sentence"
  | "document"
  | "context"
  | "topic"
  | "conversation"
  | "emotion"
  | "humor"
  | "roast"
  | "knowledge"
  | "intent"
  | "long-context";

export interface BrainEmbedding {
  kind: EmbeddingKind;
  dimensions: number;
  vector: number[];
  tokens: number;
  magnitude: number;
}

export interface BrainEmbeddingSet {
  embeddings: Record<EmbeddingKind, BrainEmbedding>;
  statistics: {
    dimensions: number;
    tokenCount: number;
    nonZeroDimensions: number;
    averageMagnitude: number;
    generatedLocally: true;
  };
}

export interface VectorMemoryItem {
  id: string;
  scope: "short" | "working" | "long" | "episode" | "semantic" | "battle" | "user" | "topic";
  ownerId?: string;
  sourceId?: string;
  content: string;
  summary?: string;
  embedding?: number[];
  topics: string[];
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface VectorMemorySearchResult {
  item: VectorMemoryItem;
  score: number;
  semanticScore: number;
  recencyScore: number;
  importanceScore: number;
  duplicateOf?: string;
}

export interface VectorMemoryReport {
  selected: VectorMemorySearchResult[];
  clusters: { topic: string; memoryIds: string[]; centroid: number[] }[];
  compressedSummary: string;
  expiredIds: string[];
  duplicateIds: string[];
  indexStats: {
    items: number;
    buckets: number;
    approximate: boolean;
    dimensions: number;
  };
}

export interface RetrievalEvidence {
  id: string;
  title: string;
  snippet: string;
  category: string;
  source: string;
  score: number;
  confidence: number;
  citation: string;
}

export interface RagReport {
  query: string;
  evidence: RetrievalEvidence[];
  rankingSignals: string[];
  confidence: number;
  citations: string[];
  offlineOnly: true;
}

export interface ReasoningReport {
  literal: string[];
  logical: string[];
  deductive: string[];
  inductive: string[];
  abductive: string[];
  probabilistic: string[];
  causal: string[];
  temporal: string[];
  spatial: string[];
  conversation: string[];
  humor: string[];
  sarcasm: string[];
  debate: string[];
  social: string[];
  psychological: string[];
  strategic: string[];
  battle: string[];
  counterArguments: string[];
  hypotheses: { claim: string; support: number; evidence: string[] }[];
  evidenceEvaluation: string[];
  selfConsistency: { passed: boolean; warnings: string[] };
  graph: { nodes: string[]; edges: { from: string; to: string; label: string }[] };
  confidence: number;
}

export interface BrainSafetyReport {
  riskLevel: "low" | "medium" | "high";
  action: "continue" | "warn" | "quarantine";
  promptInjectionSignals: string[];
  contextPoisoningSignals: string[];
  memoryPoisoningSignals: string[];
  spamSignals: string[];
  replaySignals: string[];
  abuseSignals: string[];
  tokenLimitSignals: string[];
  rateLimitSignals: string[];
  securityLog: string[];
}

export interface ResponsePlan {
  tone: string;
  length: "short" | "medium" | "long";
  humor: number;
  confidence: number;
  aggression: number;
  creativity: number;
  language: string;
  emojiUsage: number;
  battleStrategy: string;
  internalSteps: string[];
  draftGoals: string[];
}

export interface CriticReport {
  hallucinationWarnings: string[];
  contradictionWarnings: string[];
  grammarWarnings: string[];
  contextWarnings: string[];
  biasWarnings: string[];
  logicWarnings: string[];
  relevanceWarnings: string[];
  safetyWarnings: string[];
  confidence: number;
  rewriteRequired: boolean;
  corrections: string[];
}

export interface BrainResponse {
  plan: ResponsePlan;
  draft: string;
  critic: CriticReport;
  improvedDraft: string;
  finalResponse: string;
  streamableChunks: string[];
  confidence: number;
}

export interface ModelAdapterCapabilities {
  id: string;
  name: string;
  localOnly: true;
  supportsGeneration: boolean;
  supportsEmbeddings: boolean;
  supportsStreaming: boolean;
  supportsGPU: boolean;
  supportsQuantization: boolean;
  contextWindow: number;
}

export interface ModelAdapterGenerateInput {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  context?: LocalBrainResult;
}

export interface ModelAdapterGenerateOutput {
  text: string;
  tokens: number;
  latencyMs: number;
  modelId: string;
}

export interface ModelAdapter {
  capabilities: ModelAdapterCapabilities;
  generate(input: ModelAdapterGenerateInput): Promise<ModelAdapterGenerateOutput>;
  stream?(input: ModelAdapterGenerateInput): AsyncGenerator<string>;
  embed?(input: string, kind?: EmbeddingKind): Promise<BrainEmbedding>;
}

export interface BrainObservability {
  thinkingPipeline: string[];
  reasoningGraph: ReasoningReport["graph"];
  memoryRetrieval: VectorMemoryReport;
  retrievedKnowledge: RetrievalEvidence[];
  confidence: number;
  latencyMs: number;
  activeModules: string[];
  tokenStatistics: { inputTokens: number; outputTokens: number; totalTokens: number };
  embeddingStatistics: BrainEmbeddingSet["statistics"];
  inferenceSpeed: { tokensPerSecond: number; adapterId: string; cpuFallback: boolean; gpuEnabled: boolean };
  memoryHits: number;
  criticCorrections: string[];
  learningQueue: { candidates: string[]; policy: string };
}

export interface LocalBrainResult {
  version: string;
  model: ModelAdapterCapabilities;
  input: {
    conversationId?: string;
    messageCount: number;
    topic?: string;
    title?: string;
  };
  safety: BrainSafetyReport;
  nlp: NlpAnalysis;
  embeddings: BrainEmbeddingSet;
  memory: VectorMemoryReport;
  retrieval: RagReport;
  reasoning: ReasoningReport;
  response: BrainResponse;
  observability: BrainObservability;
  traces: BrainTrace[];
  generatedAt: string;
}
