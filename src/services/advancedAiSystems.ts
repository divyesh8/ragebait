export type AiSystemSide = "creator" | "opponent";

export interface AdvancedAiBattle {
  id?: string;
  title: string;
  topic: string;
  battleType?: string;
  mode?: string;
  rounds: number;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
}

export interface AdvancedAiPlayer {
  side: AiSystemSide;
  userId: string | null;
  username: string;
  aura?: number;
  wins?: number;
  losses?: number;
}

export interface AdvancedAiMessage {
  side: AiSystemSide;
  userId?: string | null;
  username: string;
  content: string;
  round: number;
  createdAt?: string | null;
}

export interface AdvancedAiScores {
  creator?: Record<string, number | undefined>;
  opponent?: Record<string, number | undefined>;
  winner?: AiSystemSide | "draw";
}

export interface AdvancedAiInput {
  battle: AdvancedAiBattle;
  players: Record<AiSystemSide, AdvancedAiPlayer>;
  messages: AdvancedAiMessage[];
  scores?: AdvancedAiScores;
  now?: number;
}

export interface MemoryEvent {
  round: number;
  side: AiSystemSide;
  username: string;
  type: "claim" | "contradiction" | "repeat" | "insult" | "promise" | "question" | "answer";
  text: string;
  linkedRound?: number;
  severity: number;
}

export interface MemoryV2 {
  summary: string;
  previousRounds: { round: number; creator?: string; opponent?: string }[];
  contradictions: MemoryEvent[];
  repeatedInsults: MemoryEvent[];
  repeatedArguments: MemoryEvent[];
  promises: MemoryEvent[];
  unansweredQuestions: MemoryEvent[];
  strongestPoint: MemoryEvent | null;
  weakestPoint: MemoryEvent | null;
  momentum: Record<AiSystemSide, number>;
}

export interface ArgumentGraphNode {
  id: string;
  side: AiSystemSide;
  username: string;
  round: number;
  claim: string;
  evidence: string[];
  counters: string[];
  rebuttals: string[];
  outcome: "open" | "supported" | "countered" | "rebutted" | "weak";
  parentId?: string;
}

export interface ArgumentGraph {
  topic: string;
  nodes: ArgumentGraphNode[];
  strongestPath: string[];
  unresolvedClaims: string[];
}

export interface MomentumPoint {
  round: number;
  creator: number;
  opponent: number;
  reason: string;
}

export interface MomentumEngine {
  creator: number;
  opponent: number;
  leader: AiSystemSide | "draw";
  shift: string;
  timeline: MomentumPoint[];
}

export interface PsychologicalProfile {
  confidence: number;
  aggression: number;
  frustration: number;
  calmness: number;
  dominance: number;
  humor: number;
  sarcasm: number;
  passiveness: number;
  coachingTone: string;
}

export interface ReputationProfile {
  originality: number;
  logic: number;
  respect: number;
  creativity: number;
  communityVotes: number;
  consistency: number;
  hiddenRating: number;
  label: string;
}

export interface DebateDnaProfile {
  aggressive: number;
  logical: number;
  funny: number;
  technical: number;
  political: number;
  emotional: number;
  styleTags: string[];
}

export interface StyleTransferSample {
  style: "Lawyer" | "Professor" | "Sigma" | "Anime" | "Gen Z" | "Corporate" | "Politician" | "News Anchor" | "Stand-up comedian";
  rewrite: string;
}

export interface AdaptiveDifficulty {
  tier: "Easy" | "Normal" | "Hard" | "Elite";
  botStrength: number;
  reason: string;
}

export interface KnowledgeSignal {
  category: "Movies" | "Anime" | "Programming" | "History" | "Science" | "Gaming" | "Sports" | "Technology" | "Music" | "Finance";
  confidence: number;
  terms: string[];
}

export interface ConversationCompression {
  summary: string;
  retainedFacts: string[];
  droppedNoise: string[];
  tokenSavingsEstimate: number;
}

export interface TimelineEvent {
  at: string;
  label: string;
  side: AiSystemSide | null;
  detail: string;
}

export interface SelfEvaluation {
  confidence: number;
  missingContext: string[];
  needsHumanReview: boolean;
  possibleHallucination: boolean;
  notes: string[];
}

export interface StrategySignal {
  side: AiSystemSide;
  nextLikelyArgument: string;
  weakness: string;
  strongCounter: string;
  direction: string;
}

export interface MultiAgentBrain {
  specialists: {
    languageExpert: string;
    logicExpert: string;
    humorExpert: string;
    moderator: string;
    judge: string;
    director: string;
  };
  directorSynthesis: string;
}

export interface CreatorAiSignals {
  suspiciousUsers: string[];
  auraFarmingSignals: string[];
  trendingTopics: string[];
  toxicClusters: string[];
  exploitAttempts: string[];
  platformSummary: string;
}

export interface LearningEngineSample {
  winner: AiSystemSide | "draw" | null;
  loser: AiSystemSide | "draw" | null;
  topic: string;
  logicScore: number;
  humorScore: number;
  length: number;
  language: string;
  aiConfidence: number;
  appealOutcome: "none" | "upheld" | "overturned" | "pending";
}

export interface ScoreReason {
  metric: string;
  side: AiSystemSide;
  score: number;
  reason: string;
}

export interface BattleHealthScore {
  healthyDebate: number;
  topicRelevance: number;
  spam: number;
  toxicity: number;
  entertainment: number;
  label: string;
}

export interface DirectorPersonalityEvent {
  tone: "hype" | "warning" | "precision" | "crown" | "laugh" | "timer";
  line: string;
  side: AiSystemSide | null;
}

export interface ContinuousImprovement {
  modelVersion: string;
  compareReady: boolean;
  historicalReplayReady: boolean;
  agreementScore: number;
  moderationFalsePositiveRisk: number;
  moderationFalseNegativeRisk: number;
  abTestStatus: string;
  rollbackReady: boolean;
}

export interface AdvancedAiReport {
  version: string;
  generatedAt: string;
  memoryV2: MemoryV2;
  argumentGraph: ArgumentGraph;
  momentum: MomentumEngine;
  psychology: Record<AiSystemSide, PsychologicalProfile>;
  reputation: Record<AiSystemSide, ReputationProfile>;
  debateDna: Record<AiSystemSide, DebateDnaProfile>;
  styleTransfer: Record<AiSystemSide, StyleTransferSample[]>;
  adaptiveDifficulty: Record<AiSystemSide, AdaptiveDifficulty>;
  knowledge: KnowledgeSignal[];
  compression: ConversationCompression;
  timeline: TimelineEvent[];
  selfEvaluation: SelfEvaluation;
  strategy: StrategySignal[];
  multiAgentBrain: MultiAgentBrain;
  creatorSignals: CreatorAiSignals;
  learningEngine: LearningEngineSample;
  explainability: ScoreReason[];
  health: BattleHealthScore;
  directorPersonality: DirectorPersonalityEvent[];
  continuousImprovement: ContinuousImprovement;
}

const VERSION = "advanced-ai-systems-v1.0";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "your", "you", "are", "was", "were", "from", "about",
  "have", "has", "had", "not", "but", "just", "like", "into", "they", "them", "their", "our", "will",
]);

const INSULT_TERMS = [
  "trash", "clown", "npc", "mid", "cope", "cooked", "washed", "dumb", "stupid", "skill issue", "fraud",
  "bot", "brainrot", "delusional", "weak", "irrelevant",
];

const KNOWLEDGE_TERMS: Record<KnowledgeSignal["category"], string[]> = {
  Movies: ["movie", "film", "cinema", "marvel", "dc", "bollywood", "hollywood", "director", "actor", "oscar"],
  Anime: ["anime", "manga", "naruto", "one piece", "jjk", "aot", "dragon ball", "gojo", "luffy"],
  Programming: ["code", "programmer", "developer", "javascript", "python", "api", "bug", "framework", "ai", "algorithm"],
  History: ["history", "war", "empire", "ancient", "king", "revolution", "colonial", "civilization"],
  Science: ["science", "physics", "biology", "chemistry", "evidence", "experiment", "climate", "space"],
  Gaming: ["game", "gaming", "ranked", "fps", "minecraft", "valorant", "fortnite", "steam", "console"],
  Sports: ["sport", "football", "cricket", "basketball", "goal", "match", "team", "player", "league"],
  Technology: ["technology", "tech", "startup", "phone", "internet", "robot", "software", "hardware", "cloud"],
  Music: ["music", "song", "album", "rap", "hip hop", "artist", "beat", "lyrics", "concert"],
  Finance: ["finance", "money", "stock", "crypto", "bank", "inflation", "investment", "market", "trading"],
};

const STYLE_ORDER: StyleTransferSample["style"][] = [
  "Lawyer",
  "Professor",
  "Sigma",
  "Anime",
  "Gen Z",
  "Corporate",
  "Politician",
  "News Anchor",
  "Stand-up comedian",
];

export function buildAdvancedAiReport(input: AdvancedAiInput): AdvancedAiReport {
  const orderedMessages = [...input.messages].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return timeValue(a.createdAt) - timeValue(b.createdAt);
  });
  const generatedAt = new Date(input.now ?? Date.now()).toISOString();
  const memoryV2 = buildMemoryV2(input, orderedMessages);
  const argumentGraph = buildArgumentGraph(input, orderedMessages);
  const momentum = buildMomentumEngine(input, orderedMessages);
  const psychology = {
    creator: buildPsychology("creator", orderedMessages),
    opponent: buildPsychology("opponent", orderedMessages),
  };
  const reputation = {
    creator: buildReputation("creator", input, orderedMessages, psychology.creator),
    opponent: buildReputation("opponent", input, orderedMessages, psychology.opponent),
  };
  const debateDna = {
    creator: buildDebateDna("creator", orderedMessages),
    opponent: buildDebateDna("opponent", orderedMessages),
  };
  const knowledge = buildKnowledgeSignals(input, orderedMessages);
  const compression = buildCompression(input, orderedMessages, memoryV2, argumentGraph);
  const timeline = buildTimeline(input, orderedMessages, memoryV2, momentum);
  const health = buildHealth(input, orderedMessages, psychology, memoryV2);
  const selfEvaluation = buildSelfEvaluation(input, orderedMessages, memoryV2, health);
  const strategy = buildStrategy(input, orderedMessages, argumentGraph, psychology);
  const explainability = buildExplainability(input, memoryV2, argumentGraph, health);
  const learningEngine = buildLearningSample(input, orderedMessages, selfEvaluation);

  return {
    version: VERSION,
    generatedAt,
    memoryV2,
    argumentGraph,
    momentum,
    psychology,
    reputation,
    debateDna,
    styleTransfer: {
      creator: buildStyleTransfer("creator", orderedMessages),
      opponent: buildStyleTransfer("opponent", orderedMessages),
    },
    adaptiveDifficulty: {
      creator: buildAdaptiveDifficulty(input.players.creator, reputation.creator),
      opponent: buildAdaptiveDifficulty(input.players.opponent, reputation.opponent),
    },
    knowledge,
    compression,
    timeline,
    selfEvaluation,
    strategy,
    multiAgentBrain: buildMultiAgentBrain(input, memoryV2, argumentGraph, health),
    creatorSignals: buildCreatorSignals(input, orderedMessages, memoryV2, health, knowledge),
    learningEngine,
    explainability,
    health,
    directorPersonality: buildDirectorPersonality(input, momentum, health, memoryV2, timeline),
    continuousImprovement: buildContinuousImprovement(input, selfEvaluation),
  };
}

function buildMemoryV2(input: AdvancedAiInput, messages: AdvancedAiMessage[]): MemoryV2 {
  const previousRounds = buildPreviousRounds(messages);
  const contradictions = detectContradictions(messages);
  const repeatedInsults = detectRepeatedInsults(messages);
  const repeatedArguments = detectRepeatedArguments(messages);
  const promises = detectPromises(messages);
  const unansweredQuestions = detectUnansweredQuestions(messages);
  const scored = messages.map((message) => ({ message, score: messageStrength(input.battle.topic, message.content) }));
  const strongest = scored.length ? [...scored].sort((a, b) => b.score - a.score)[0] : null;
  const weakest = scored.length ? [...scored].sort((a, b) => a.score - b.score)[0] : null;
  const creatorMomentum = sideRawMomentum(input.battle.topic, messages.filter((message) => message.side === "creator"));
  const opponentMomentum = sideRawMomentum(input.battle.topic, messages.filter((message) => message.side === "opponent"));

  return {
    summary: `Memory Engine V2 tracked ${messages.length} messages, ${contradictions.length} contradiction signal${s(contradictions.length)}, ${repeatedArguments.length} repeated argument signal${s(repeatedArguments.length)}, and ${unansweredQuestions.length} unanswered question${s(unansweredQuestions.length)}.`,
    previousRounds,
    contradictions,
    repeatedInsults,
    repeatedArguments,
    promises,
    unansweredQuestions,
    strongestPoint: strongest ? toMemoryEvent(strongest.message, "claim", strongest.message.content, strongest.score) : null,
    weakestPoint: weakest ? toMemoryEvent(weakest.message, "claim", weakest.message.content, 100 - weakest.score) : null,
    momentum: {
      creator: creatorMomentum,
      opponent: opponentMomentum,
    },
  };
}

function buildPreviousRounds(messages: AdvancedAiMessage[]) {
  const byRound = new Map<number, { round: number; creator?: string; opponent?: string }>();
  for (const message of messages) {
    const row = byRound.get(message.round) ?? { round: message.round };
    row[message.side] = message.content;
    byRound.set(message.round, row);
  }
  return Array.from(byRound.values()).sort((a, b) => a.round - b.round);
}

function detectContradictions(messages: AdvancedAiMessage[]): MemoryEvent[] {
  const events: MemoryEvent[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const own = messages.filter((message) => message.side === side);
    for (let i = 0; i < own.length; i++) {
      const current = own[i];
      const lower = current.content.toLowerCase();
      const denialTerms = extractDenialTerms(lower);
      if (denialTerms.length === 0) continue;
      const earlier = own.slice(0, i).find((message) => {
        const earlierTerms = keywordTokens(message.content);
        return denialTerms.some((term) => earlierTerms.includes(term));
      });
      if (earlier) {
        events.push({
          round: current.round,
          side,
          username: current.username,
          type: "contradiction",
          text: `Contradiction detected. Earlier statement found in round ${earlier.round}: "${truncate(earlier.content, 90)}"`,
          linkedRound: earlier.round,
          severity: 92,
        });
      }
    }
  }
  return events.slice(0, 6);
}

function extractDenialTerms(text: string): string[] {
  const denialMatch =
    text.match(/\b(?:i|we)\s+(?:never|didn'?t|do not|don't)\s+(?:say|said|claim|claimed|argue|argued|promise|promised)\s+(.{0,80})/i) ||
    text.match(/\bnever\s+(?:said|claimed|argued|promised)\s+(.{0,80})/i);
  if (!denialMatch) return [];
  return keywordTokens(denialMatch[1] ?? "").slice(0, 8);
}

function detectRepeatedInsults(messages: AdvancedAiMessage[]): MemoryEvent[] {
  const events: MemoryEvent[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const counts = new Map<string, { count: number; first: AdvancedAiMessage; latest: AdvancedAiMessage }>();
    for (const message of messages.filter((item) => item.side === side)) {
      const lower = message.content.toLowerCase();
      for (const insult of INSULT_TERMS) {
        if (!lower.includes(insult)) continue;
        const row = counts.get(insult) ?? { count: 0, first: message, latest: message };
        row.count++;
        row.latest = message;
        counts.set(insult, row);
      }
    }
    for (const [insult, row] of counts) {
      if (row.count >= 2) {
        events.push({
          round: row.latest.round,
          side,
          username: row.latest.username,
          type: "insult",
          text: `${row.latest.username} repeated "${insult}" ${row.count} times since round ${row.first.round}.`,
          linkedRound: row.first.round,
          severity: clamp(42 + row.count * 14),
        });
      }
    }
  }
  return events.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

function detectRepeatedArguments(messages: AdvancedAiMessage[]): MemoryEvent[] {
  const events: MemoryEvent[] = [];
  for (const side of ["creator", "opponent"] as const) {
    const own = messages.filter((message) => message.side === side);
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        const overlap = tokenOverlap(own[i].content, own[j].content);
        if (overlap >= 0.58) {
          events.push({
            round: own[j].round,
            side,
            username: own[j].username,
            type: "repeat",
            text: `${own[j].username} repeated a similar argument in rounds ${own[i].round} and ${own[j].round}.`,
            linkedRound: own[i].round,
            severity: clamp(Math.round(overlap * 100)),
          });
        }
      }
    }
  }
  return events.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

function detectPromises(messages: AdvancedAiMessage[]): MemoryEvent[] {
  return messages
    .filter((message) => /\b(i will|i'll|we will|watch me|next round|promise|guarantee)\b/i.test(message.content))
    .map((message) => toMemoryEvent(message, "promise", `${message.username} made a promise or setup in round ${message.round}: "${truncate(message.content, 90)}"`, 70))
    .slice(0, 6);
}

function detectUnansweredQuestions(messages: AdvancedAiMessage[]): MemoryEvent[] {
  const events: MemoryEvent[] = [];
  for (let i = 0; i < messages.length; i++) {
    const question = messages[i];
    if (!question.content.includes("?")) continue;
    const answer = messages.slice(i + 1).find((message) => {
      if (message.side === question.side) return false;
      if (message.round > question.round + 1) return false;
      return tokenOverlap(question.content, message.content) >= 0.18 || /\b(because|answer|actually|yes|no|that|this)\b/i.test(message.content);
    });
    if (!answer) {
      events.push({
        round: question.round,
        side: question.side,
        username: question.username,
        type: "question",
        text: `${question.username}'s round ${question.round} question appears unanswered: "${truncate(question.content, 90)}"`,
        severity: 72,
      });
    }
  }
  return events.slice(0, 6);
}

function buildArgumentGraph(input: AdvancedAiInput, messages: AdvancedAiMessage[]): ArgumentGraph {
  const nodes: ArgumentGraphNode[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const previousOpponent = [...messages.slice(0, i)].reverse().find((item) => item.side !== message.side);
    const evidence = extractEvidence(message.content);
    const counters = previousOpponent && isCounter(message.content)
      ? [`Counters round ${previousOpponent.round}: "${truncate(previousOpponent.content, 80)}"`]
      : [];
    const rebuttals = previousOpponent && tokenOverlap(message.content, previousOpponent.content) >= 0.22
      ? [`Rebuttal link to ${previousOpponent.username}'s round ${previousOpponent.round}`]
      : [];
    const support = evidence.length + counters.length + rebuttals.length;
    nodes.push({
      id: `r${message.round}-${message.side}-${i}`,
      side: message.side,
      username: message.username,
      round: message.round,
      claim: truncate(message.content, 180),
      evidence,
      counters,
      rebuttals,
      outcome: support >= 2 ? "rebutted" : counters.length ? "countered" : evidence.length ? "supported" : message.content.length < 24 ? "weak" : "open",
      parentId: previousOpponent ? `r${previousOpponent.round}-${previousOpponent.side}-${messages.indexOf(previousOpponent)}` : undefined,
    });
  }

  const strongestPath = nodes
    .map((node) => ({ node, score: node.evidence.length * 18 + node.counters.length * 22 + node.rebuttals.length * 22 + node.claim.length / 18 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.node.id);

  return {
    topic: input.battle.topic,
    nodes,
    strongestPath,
    unresolvedClaims: nodes
      .filter((node) => node.outcome === "open" || node.outcome === "weak")
      .slice(0, 5)
      .map((node) => `${node.username}, round ${node.round}: ${truncate(node.claim, 80)}`),
  };
}

function extractEvidence(text: string): string[] {
  const evidence: string[] = [];
  if (/\b(because|therefore|so|as a result|which means)\b/i.test(text)) evidence.push("reasoning connector");
  if (/\b(example|for example|proof|evidence|data|numbers|stat|study|receipt)\b/i.test(text)) evidence.push("explicit evidence");
  if (/\d/.test(text)) evidence.push("numeric detail");
  if (/\b(round|earlier|you said|your point)\b/i.test(text)) evidence.push("transcript reference");
  return evidence.slice(0, 4);
}

function buildMomentumEngine(input: AdvancedAiInput, messages: AdvancedAiMessage[]): MomentumEngine {
  const rounds = Array.from(new Set(messages.map((message) => message.round))).sort((a, b) => a - b);
  const timeline = rounds.map((round) => {
    const upto = messages.filter((message) => message.round <= round);
    const creator = sideRawMomentum(input.battle.topic, upto.filter((message) => message.side === "creator"));
    const opponent = sideRawMomentum(input.battle.topic, upto.filter((message) => message.side === "opponent"));
    const reason = creator === opponent
      ? `Round ${round} stayed even.`
      : `${creator > opponent ? input.players.creator.username : input.players.opponent.username} gained live pressure in round ${round}.`;
    return { round, creator, opponent, reason };
  });
  const latest = timeline[timeline.length - 1] ?? { round: 0, creator: 50, opponent: 50, reason: "Waiting for more debate data." };
  const leader = Math.abs(latest.creator - latest.opponent) <= 4 ? "draw" : latest.creator > latest.opponent ? "creator" : "opponent";
  const previous = timeline[timeline.length - 2];
  const shift = previous
    ? describeMomentumShift(input, previous, latest)
    : "Momentum opens once both sides have posted.";

  return {
    creator: latest.creator,
    opponent: latest.opponent,
    leader,
    shift,
    timeline,
  };
}

function describeMomentumShift(input: AdvancedAiInput, previous: MomentumPoint, latest: MomentumPoint): string {
  const beforeLeader = Math.abs(previous.creator - previous.opponent) <= 4 ? "draw" : previous.creator > previous.opponent ? "creator" : "opponent";
  const afterLeader = Math.abs(latest.creator - latest.opponent) <= 4 ? "draw" : latest.creator > latest.opponent ? "creator" : "opponent";
  if (beforeLeader !== afterLeader && afterLeader !== "draw") {
    return `Momentum shifted to ${input.players[afterLeader].username} in round ${latest.round}.`;
  }
  const side = latest.creator - previous.creator > latest.opponent - previous.opponent ? "creator" : "opponent";
  return `${input.players[side].username} made the bigger latest momentum gain.`;
}

function buildPsychology(side: AiSystemSide, messages: AdvancedAiMessage[]): PsychologicalProfile {
  const text = sideText(side, messages);
  const messageCount = messages.filter((message) => message.side === side).length;
  const aggression = clamp(28 + hits(text, /\b(trash|clown|cooked|destroy|cope|npc|mid|fraud|weak)\b/gi) * 9 + hits(text, /!/g) * 2);
  const humor = clamp(24 + hits(text, /\b(lol|haha|joke|meme|bro|wild|ratio|cooked|peak)\b/gi) * 8);
  const sarcasm = clamp(18 + hits(text, /\b(sure|totally|wow|genius|nice logic|great point)\b/gi) * 12);
  const confidence = clamp(38 + hits(text, /\b(clearly|obvious|watch|trust|guarantee|no doubt|easy)\b/gi) * 8 + messageCount * 4);
  const frustration = clamp(16 + hits(text, /\b(again|still|answer me|ignored|bro what|are you serious)\b/gi) * 10 + hits(text, /\?/g) * 3);
  const passiveness = clamp(52 - confidence / 3 - aggression / 5 + hits(text, /\b(maybe|idk|i guess|whatever|fine)\b/gi) * 10);
  const calmness = clamp(76 - aggression * 0.45 - frustration * 0.35 + hits(text, /\b(fair|respect|good point|i agree)\b/gi) * 8);
  const dominance = clamp(confidence * 0.44 + aggression * 0.25 + humor * 0.14 + hits(text, /\b(you said|answer|caught|exposed)\b/gi) * 5);

  return {
    confidence,
    aggression,
    frustration,
    calmness,
    dominance,
    humor,
    sarcasm,
    passiveness,
    coachingTone: aggression > 72
      ? "Keep commentary firm and redirect toward sharper argument quality."
      : frustration > 68
      ? "Use calming coaching and point them toward direct answers."
      : confidence > 72
      ? "Challenge them with higher standards and cleaner counters."
      : "Use supportive coaching with one concrete next move.",
  };
}

function buildReputation(
  side: AiSystemSide,
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  psychology: PsychologicalProfile
): ReputationProfile {
  const own = messages.filter((message) => message.side === side);
  const text = own.map((message) => message.content).join(" ");
  const unique = uniqueRatio(text);
  const originality = clamp(35 + unique * 58 - repeatedPenalty(own) * 5);
  const logic = readScore(input.scores?.[side], "logic") || clamp(34 + hits(text, /\b(because|therefore|evidence|proof|reason|data)\b/gi) * 9);
  const respect = clamp(88 - psychology.aggression * 0.42 - hits(text, /\b(kill yourself|doxx|hate|slur)\b/gi) * 30);
  const creativity = readScore(input.scores?.[side], "creativity") || clamp(35 + unique * 45 + psychology.humor * 0.22);
  const communityVotes = clamp(45 + psychology.humor * 0.22 + psychology.dominance * 0.18 + hits(text, /[!?]/g) * 2);
  const consistency = readScore(input.scores?.[side], "consistency") || clamp(78 - repeatedPenalty(own) * 10);
  const hiddenRating = clamp(originality * 0.2 + logic * 0.24 + respect * 0.18 + creativity * 0.18 + communityVotes * 0.1 + consistency * 0.1);

  return {
    originality,
    logic,
    respect,
    creativity,
    communityVotes,
    consistency,
    hiddenRating,
    label: hiddenRating >= 82 ? "High-trust contender" : hiddenRating >= 66 ? "Reliable battler" : hiddenRating >= 48 ? "Volatile battler" : "Needs review",
  };
}

function buildDebateDna(side: AiSystemSide, messages: AdvancedAiMessage[]): DebateDnaProfile {
  const text = sideText(side, messages);
  const aggressive = clamp(30 + hits(text, /\b(trash|destroy|cooked|cope|fraud|weak|npc)\b/gi) * 9);
  const logical = clamp(32 + hits(text, /\b(because|logic|evidence|therefore|proof|reason|data)\b/gi) * 10);
  const funny = clamp(28 + hits(text, /\b(lol|haha|meme|wild|bro|ratio|joke)\b/gi) * 9);
  const technical = clamp(18 + hits(text, /\b(code|api|programmer|algorithm|data|software|ai|model|bug)\b/gi) * 10);
  const political = clamp(14 + hits(text, /\b(politics|government|policy|vote|election|law|minister|party)\b/gi) * 10);
  const emotional = clamp(20 + hits(text, /\b(feel|angry|sad|love|hate|scared|respect|hurt)\b/gi) * 8 + hits(text, /!/g) * 2);
  const traits = [
    ["Aggressive", aggressive],
    ["Logical", logical],
    ["Funny", funny],
    ["Technical", technical],
    ["Political", political],
    ["Emotional", emotional],
  ]
    .filter(([, value]) => Number(value) >= 58)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([label]) => String(label));

  return {
    aggressive,
    logical,
    funny,
    technical,
    political,
    emotional,
    styleTags: traits.length ? traits.slice(0, 4) : ["Balanced"],
  };
}

function buildStyleTransfer(side: AiSystemSide, messages: AdvancedAiMessage[]): StyleTransferSample[] {
  const latest = [...messages].reverse().find((message) => message.side === side)?.content ?? "I need a stronger point.";
  const base = truncate(latest.replace(/\s+/g, " ").trim(), 120);
  return STYLE_ORDER.map((style) => ({
    style,
    rewrite: rewriteStyle(style, base),
  }));
}

function rewriteStyle(style: StyleTransferSample["style"], text: string): string {
  const clean = text || "This point needs stronger evidence.";
  const rewrites: Record<StyleTransferSample["style"], string> = {
    Lawyer: `Your honor, the record shows one thing clearly: ${clean}`,
    Professor: `The core lesson is simple: ${clean} Now connect it to evidence.`,
    Sigma: `No noise, just leverage: ${clean}`,
    Anime: `This is the turning-point speech before the final clash: ${clean}`,
    "Gen Z": `No cap, the whole point is: ${clean}`,
    Corporate: `The strategic takeaway is that ${clean}`,
    Politician: `Let me be clear to everyone watching: ${clean}`,
    "News Anchor": `Breaking in this debate: ${clean}`,
    "Stand-up comedian": `The punchline is already in the room: ${clean}`,
  };
  return rewrites[style];
}

function buildAdaptiveDifficulty(player: AdvancedAiPlayer, reputation: ReputationProfile): AdaptiveDifficulty {
  const battles = (player.wins ?? 0) + (player.losses ?? 0);
  const skill = reputation.hiddenRating + Math.min(14, battles * 1.4) + Math.min(10, (player.aura ?? 0) / 180);
  if (skill >= 92) return { tier: "Elite", botStrength: 95, reason: "Top players should face elite bots with strong counters and fewer obvious openings." };
  if (skill >= 74) return { tier: "Hard", botStrength: 78, reason: "Experienced users get harder bots that punish repetition and weak evidence." };
  if (skill >= 52) return { tier: "Normal", botStrength: 58, reason: "Developing users get balanced bots that still leave teachable openings." };
  return { tier: "Easy", botStrength: 38, reason: "New users get easier bots that explain openings and avoid overwhelming pressure." };
}

function buildKnowledgeSignals(input: AdvancedAiInput, messages: AdvancedAiMessage[]): KnowledgeSignal[] {
  const text = `${input.battle.title} ${input.battle.topic} ${messages.map((message) => message.content).join(" ")}`.toLowerCase();
  return (Object.entries(KNOWLEDGE_TERMS) as [KnowledgeSignal["category"], string[]][])
    .map(([category, terms]) => {
      const matched = terms.filter((term) => text.includes(term));
      return {
        category,
        confidence: clamp(20 + matched.length * 22),
        terms: matched.slice(0, 8),
      };
    })
    .filter((signal) => signal.terms.length > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

function buildCompression(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  memory: MemoryV2,
  graph: ArgumentGraph
): ConversationCompression {
  const facts = [
    `Topic: ${input.battle.topic}`,
    memory.strongestPoint ? `Strongest point: ${memory.strongestPoint.username} round ${memory.strongestPoint.round}` : "",
    memory.weakestPoint ? `Weakest point: ${memory.weakestPoint.username} round ${memory.weakestPoint.round}` : "",
    ...memory.contradictions.slice(0, 2).map((event) => event.text),
    ...graph.unresolvedClaims.slice(0, 2).map((claim) => `Unresolved: ${claim}`),
  ].filter(Boolean);
  const sourceWords = messages.map((message) => message.content).join(" ").split(/\s+/).filter(Boolean).length;
  const summary = facts.join(" ");
  const summaryWords = summary.split(/\s+/).filter(Boolean).length;

  return {
    summary: summary || `Rounds are still sparse; keep topic ${input.battle.topic} and direct counters in memory.`,
    retainedFacts: facts.slice(0, 8),
    droppedNoise: messages
      .filter((message) => message.content.length < 24 || /^[\W_]+$/u.test(message.content.trim()))
      .slice(0, 4)
      .map((message) => `${message.username}, round ${message.round}: low-information line`),
    tokenSavingsEstimate: sourceWords > 0 ? clamp(Math.round((1 - summaryWords / sourceWords) * 100)) : 0,
  };
}

function buildTimeline(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  memory: MemoryV2,
  momentum: MomentumEngine
): TimelineEvent[] {
  const start = input.battle.createdAt ? new Date(input.battle.createdAt).getTime() : timeValue(messages[0]?.createdAt) || Date.now();
  const events: TimelineEvent[] = [];
  const firstClaim = messages[0];
  if (firstClaim) {
    events.push({
      at: offsetLabel(start, firstClaim.createdAt, 12),
      label: "First Claim",
      side: firstClaim.side,
      detail: `${firstClaim.username}: ${truncate(firstClaim.content, 90)}`,
    });
  }
  const firstCounter = messages.find((message, index) => index > 0 && isCounter(message.content));
  if (firstCounter) {
    events.push({
      at: offsetLabel(start, firstCounter.createdAt, 49),
      label: "First Counter",
      side: firstCounter.side,
      detail: `${firstCounter.username} answered pressure in round ${firstCounter.round}.`,
    });
  }
  if (memory.contradictions[0]) {
    events.push({
      at: offsetLabel(start, messageAt(messages, memory.contradictions[0]), 82),
      label: "Major Contradiction",
      side: memory.contradictions[0].side,
      detail: memory.contradictions[0].text,
    });
  }
  const funniest = [...messages].sort((a, b) => humorScore(b.content) - humorScore(a.content))[0];
  if (funniest) {
    events.push({
      at: offsetLabel(start, funniest.createdAt, 135),
      label: "Best Roast",
      side: funniest.side,
      detail: `${funniest.username}: ${truncate(funniest.content, 90)}`,
    });
  }
  const shift = momentum.timeline.find((point, index, list) => {
    const prev = list[index - 1];
    if (!prev) return false;
    return (point.creator > point.opponent) !== (prev.creator > prev.opponent);
  });
  if (shift) {
    events.push({
      at: offsetLabel(start, messages.find((message) => message.round === shift.round)?.createdAt, 220),
      label: "Momentum Shift",
      side: shift.creator > shift.opponent ? "creator" : "opponent",
      detail: shift.reason,
    });
  }
  if (input.battle.status === "completed") {
    events.push({
      at: offsetLabel(start, input.battle.completedAt, 295),
      label: "Winner Decided",
      side: input.scores?.winner === "creator" || input.scores?.winner === "opponent" ? input.scores.winner : null,
      detail: input.scores?.winner && input.scores.winner !== "draw" ? `${input.players[input.scores.winner].username} won the verdict.` : "The verdict landed as a draw or close finish.",
    });
  }
  return events.slice(0, 8);
}

function buildSelfEvaluation(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  memory: MemoryV2,
  health: BattleHealthScore
): SelfEvaluation {
  const expected = input.battle.rounds * 2;
  const completeness = expected > 0 ? messages.length / expected : 0;
  const confidence = clamp(44 + completeness * 32 + health.healthyDebate * 0.18 - memory.contradictions.length * 3);
  const missingContext = [
    messages.length < expected ? "Transcript is not complete yet." : "",
    messages.length < 4 ? "Only a small number of turns are available." : "",
    health.topicRelevance < 45 ? "Topic relevance is weak, so scoring needs caution." : "",
  ].filter(Boolean);
  const needsHumanReview = health.toxicity >= 65 || confidence < 48;

  return {
    confidence,
    missingContext,
    needsHumanReview,
    possibleHallucination: confidence < 40 || messages.length === 0,
    notes: [
      `Confidence is ${confidence}/100.`,
      needsHumanReview ? "Human review recommended before high-impact enforcement." : "Automated analysis is acceptable for product feedback.",
    ],
  };
}

function buildStrategy(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  graph: ArgumentGraph,
  psychology: Record<AiSystemSide, PsychologicalProfile>
): StrategySignal[] {
  return (["creator", "opponent"] as const).map((side) => {
    const opponent = side === "creator" ? "opponent" : "creator";
    const ownLast = [...messages].reverse().find((message) => message.side === side);
    const opponentLast = [...messages].reverse().find((message) => message.side === opponent);
    const weakClaim = graph.nodes.find((node) => node.side === side && node.outcome === "weak");
    return {
      side,
      nextLikelyArgument: ownLast
        ? `${input.players[side].username} will likely extend round ${ownLast.round}'s angle.`
        : `${input.players[side].username} needs an opening claim.`,
      weakness: weakClaim
        ? `Weak spot: round ${weakClaim.round} was under-supported.`
        : psychology[side].frustration > 65
        ? "Weak spot: frustration may pull them off topic."
        : "Weak spot: needs a more direct answer to the strongest opposing point.",
      strongCounter: opponentLast
        ? `Attack the assumption in "${truncate(opponentLast.content, 80)}" with evidence or a callback.`
        : "Force the opponent to define their claim before countering.",
      direction: psychology[opponent].passiveness > 60
        ? "Pressure the passive side with a direct question."
        : "Expect more counterpunching and callbacks next round.",
    };
  });
}

function buildMultiAgentBrain(
  input: AdvancedAiInput,
  memory: MemoryV2,
  graph: ArgumentGraph,
  health: BattleHealthScore
): MultiAgentBrain {
  const graphLead = graph.nodes.find((node) => graph.strongestPath.includes(node.id));
  return {
    specialists: {
      languageExpert: `Tracked plain meaning, slang, sarcasm, and topic vocabulary for ${input.battle.topic}.`,
      logicExpert: graphLead ? `Strongest graph node is ${graphLead.username}'s round ${graphLead.round} claim.` : "Waiting for stronger claims.",
      humorExpert: memory.strongestPoint ? `Best entertainment candidate: ${memory.strongestPoint.username}, round ${memory.strongestPoint.round}.` : "Humor signal is still light.",
      moderator: health.toxicity > 55 ? "Moderator sees elevated toxicity and recommends caution." : "Moderator sees normal competitive banter.",
      judge: `Judge should weigh argument graph, momentum, and health before final score.`,
      director: health.healthyDebate > 70 ? "Director can keep the tone hype." : "Director should steer the battle back to cleaner exchanges.",
    },
    directorSynthesis: `${health.label}. ${memory.summary}`,
  };
}

function buildCreatorSignals(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  memory: MemoryV2,
  health: BattleHealthScore,
  knowledge: KnowledgeSignal[]
): CreatorAiSignals {
  const suspicious = (["creator", "opponent"] as const)
    .filter((side) => {
      const own = messages.filter((message) => message.side === side);
      return repeatedPenalty(own) >= 2 || own.some((message) => /^[\W_]{6,}$/u.test(message.content.trim()));
    })
    .map((side) => input.players[side].username);

  return {
    suspiciousUsers: suspicious,
    auraFarmingSignals: memory.repeatedArguments.length >= 2 ? ["Repeated low-variance arguments may indicate farming or low-effort battles."] : [],
    trendingTopics: knowledge.length ? knowledge.map((signal) => signal.category) : [input.battle.topic],
    toxicClusters: health.toxicity > 55 ? [`${input.battle.topic} battle has elevated toxicity.`] : [],
    exploitAttempts: messages.some((message) => /\b(copy paste|bot|script|farm aura|exploit)\b/i.test(message.content))
      ? ["Transcript mentions botting, scripts, farming, or exploit language."]
      : [],
    platformSummary: `${input.battle.title}: ${messages.length} messages, ${health.healthyDebate}% health, ${memory.contradictions.length} contradiction signal${s(memory.contradictions.length)}.`,
  };
}

function buildLearningSample(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  selfEvaluation: SelfEvaluation
): LearningEngineSample {
  const winner = input.scores?.winner ?? null;
  const loser = winner === "creator" ? "opponent" : winner === "opponent" ? "creator" : winner;
  return {
    winner,
    loser,
    topic: input.battle.topic,
    logicScore: averageScore(input.scores, "logic"),
    humorScore: averageScore(input.scores, "humor"),
    length: messages.reduce((sum, message) => sum + message.content.length, 0),
    language: detectLanguage(messages),
    aiConfidence: selfEvaluation.confidence,
    appealOutcome: "none",
  };
}

function buildExplainability(
  input: AdvancedAiInput,
  memory: MemoryV2,
  graph: ArgumentGraph,
  health: BattleHealthScore
): ScoreReason[] {
  const metrics = ["logic", "humor", "creativity", "originality", "relevance", "counterarguments", "consistency", "audienceImpact", "total"];
  const reasons: ScoreReason[] = [];
  for (const side of ["creator", "opponent"] as const) {
    for (const metric of metrics) {
      const score = readScore(input.scores?.[side], metric);
      if (!score) continue;
      reasons.push({
        metric,
        side,
        score,
        reason: explainMetric(side, metric, score, input, memory, graph, health),
      });
    }
  }
  return reasons.slice(0, 24);
}

function explainMetric(
  side: AiSystemSide,
  metric: string,
  score: number,
  input: AdvancedAiInput,
  memory: MemoryV2,
  graph: ArgumentGraph,
  health: BattleHealthScore
): string {
  const name = input.players[side].username;
  const graphHits = graph.nodes.filter((node) => node.side === side && (node.outcome === "supported" || node.outcome === "countered" || node.outcome === "rebutted")).length;
  const repeated = memory.repeatedArguments.filter((event) => event.side === side).length;
  if (metric === "logic") return `${name} scored ${score}/100 from supported claims, evidence markers, and ${graphHits} useful graph link${s(graphHits)}.`;
  if (metric === "humor") return `${name} scored ${score}/100 from punchline density, audience-language markers, and timing.`;
  if (metric === "creativity") return `${name} scored ${score}/100 from fresh wording, unique terms, and non-recycled angles.`;
  if (metric === "originality") return `${name} scored ${score}/100; repeated-argument pressure counted ${repeated} time${s(repeated)}.`;
  if (metric === "relevance") return `${name} scored ${score}/100 with battle health showing ${health.topicRelevance}% topic relevance.`;
  if (metric === "counterarguments") return `${name} scored ${score}/100 from direct counters, callbacks, and opponent-message engagement.`;
  if (metric === "consistency") return `${name} scored ${score}/100 after checking contradictions and promise follow-through.`;
  if (metric === "audienceImpact") return `${name} scored ${score}/100 from humor, dominance, and shareable-line signals.`;
  return `${name}'s total reflects the weighted blend of graph strength, momentum, health, and category scores.`;
}

function buildHealth(
  input: AdvancedAiInput,
  messages: AdvancedAiMessage[],
  psychology: Record<AiSystemSide, PsychologicalProfile>,
  memory: MemoryV2
): BattleHealthScore {
  const topicRelevance = average([
    sideTopicRelevance(input.battle.topic, messages.filter((message) => message.side === "creator")),
    sideTopicRelevance(input.battle.topic, messages.filter((message) => message.side === "opponent")),
  ]);
  const spam = clamp(
    messages.filter((message) => /^[\W_]{5,}$/u.test(message.content.trim()) || message.content.trim().length < 8).length * 16 +
      memory.repeatedArguments.length * 9
  );
  const toxicity = clamp((psychology.creator.aggression + psychology.opponent.aggression) / 2 + severeHits(messages) * 24);
  const entertainment = clamp((psychology.creator.humor + psychology.opponent.humor) / 2 + messages.length * 3);
  const healthyDebate = clamp(topicRelevance * 0.36 + (100 - spam) * 0.22 + (100 - toxicity) * 0.2 + entertainment * 0.22);

  return {
    healthyDebate,
    topicRelevance,
    spam,
    toxicity,
    entertainment,
    label: healthyDebate >= 85 ? "Healthy Debate" : healthyDebate >= 65 ? "Competitive Debate" : healthyDebate >= 45 ? "Needs Steering" : "Review Needed",
  };
}

function buildDirectorPersonality(
  input: AdvancedAiInput,
  momentum: MomentumEngine,
  health: BattleHealthScore,
  memory: MemoryV2,
  timeline: TimelineEvent[]
): DirectorPersonalityEvent[] {
  const events: DirectorPersonalityEvent[] = [];
  if (momentum.leader !== "draw") {
    events.push({
      tone: "crown",
      line: `Momentum shifted toward ${input.players[momentum.leader].username}.`,
      side: momentum.leader,
    });
  } else {
    events.push({ tone: "precision", line: "This is still balanced. One clean counter can flip it.", side: null });
  }
  if (memory.contradictions[0]) events.push({ tone: "warning", line: memory.contradictions[0].text, side: memory.contradictions[0].side });
  if (health.topicRelevance < 55) events.push({ tone: "warning", line: "Off-topic warning: tie the next hit back to the topic.", side: null });
  if (health.entertainment >= 75) events.push({ tone: "laugh", line: "Crowd signal is hot. The entertainment score is carrying.", side: null });
  if (timeline.some((event) => event.label === "Best Roast")) events.push({ tone: "hype", line: "Massive comeback potential is live.", side: null });
  events.push({ tone: "timer", line: input.battle.status === "active" ? "Final turns matter. No filler now." : "Replay ready for verdict analysis.", side: null });
  return events.slice(0, 5);
}

function buildContinuousImprovement(input: AdvancedAiInput, selfEvaluation: SelfEvaluation): ContinuousImprovement {
  const completed = input.battle.status === "completed";
  return {
    modelVersion: VERSION,
    compareReady: completed,
    historicalReplayReady: completed,
    agreementScore: clamp(selfEvaluation.confidence + (completed ? 8 : -6)),
    moderationFalsePositiveRisk: selfEvaluation.needsHumanReview ? 18 : 7,
    moderationFalseNegativeRisk: selfEvaluation.needsHumanReview ? 22 : 9,
    abTestStatus: completed ? "Eligible for scoring replay and A/B comparison." : "Collecting live transcript before replay tests.",
    rollbackReady: true,
  };
}

function sideRawMomentum(topic: string, messages: AdvancedAiMessage[]): number {
  if (!messages.length) return 35;
  const text = messages.map((message) => message.content).join(" ");
  return clamp(
    30 +
      sideTopicRelevance(topic, messages) * 0.24 +
      hits(text, /\b(because|therefore|evidence|proof|reason|logic)\b/gi) * 5 +
      hits(text, /\b(but|actually|you said|still|answer|caught)\b/gi) * 6 +
      hits(text, /\b(lol|haha|wild|cooked|ratio|bro)\b/gi) * 4 +
      Math.min(18, text.length / 90) +
      Math.min(12, messages.length * 3)
  );
}

function sideTopicRelevance(topic: string, messages: AdvancedAiMessage[]): number {
  if (!messages.length) return 50;
  const topicTokens = keywordTokens(topic);
  if (!topicTokens.length) return 62;
  const text = messages.map((message) => message.content).join(" ").toLowerCase();
  const hits = topicTokens.filter((token) => text.includes(token)).length;
  return clamp(40 + hits * 16 + (/\b(because|point|topic|means)\b/i.test(text) ? 8 : 0));
}

function messageStrength(topic: string, content: string): number {
  return clamp(
    sideTopicRelevance(topic, [{ side: "creator", username: "", content, round: 1 }]) * 0.32 +
      content.length / 8 +
      hits(content, /\b(because|therefore|evidence|proof|reason|logic)\b/gi) * 10 +
      hits(content, /\b(but|actually|you said|still|answer)\b/gi) * 8 +
      hits(content, /\b(lol|haha|wild|cooked|ratio|bro)\b/gi) * 4
  );
}

function toMemoryEvent(message: AdvancedAiMessage, type: MemoryEvent["type"], text: string, severity: number): MemoryEvent {
  return {
    round: message.round,
    side: message.side,
    username: message.username,
    type,
    text: truncate(text, 220),
    severity: clamp(severity),
  };
}

function keywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 40);
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(keywordTokens(a));
  const bTokens = new Set(keywordTokens(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let shared = 0;
  for (const token of aTokens) if (bTokens.has(token)) shared++;
  return shared / Math.min(aTokens.size, bTokens.size);
}

function sideText(side: AiSystemSide, messages: AdvancedAiMessage[]): string {
  return messages.filter((message) => message.side === side).map((message) => message.content).join(" ");
}

function uniqueRatio(text: string): number {
  const words = keywordTokens(text);
  if (!words.length) return 0;
  return new Set(words).size / words.length;
}

function repeatedPenalty(messages: AdvancedAiMessage[]): number {
  let repeats = 0;
  for (let i = 0; i < messages.length; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      if (tokenOverlap(messages[i].content, messages[j].content) > 0.58) repeats++;
    }
  }
  return repeats;
}

function isCounter(text: string): boolean {
  return /\b(but|actually|you said|your point|still|answer|wrong|except|and yet|that proves)\b/i.test(text);
}

function humorScore(text: string): number {
  return text.length / 10 + hits(text, /\b(lol|haha|wild|cooked|ratio|bro|meme|peak)\b/gi) * 12 + hits(text, /[!?]/g) * 3;
}

function severeHits(messages: AdvancedAiMessage[]): number {
  return messages.filter((message) => /\b(kill yourself|doxx|address leak|terrorist|nazi)\b/i.test(message.content)).length;
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function averageScore(scores: AdvancedAiScores | undefined, metric: string): number {
  const values = [readScore(scores?.creator, metric), readScore(scores?.opponent, metric)].filter((value) => value > 0);
  return values.length ? average(values) : 0;
}

function readScore(scores: Record<string, number | undefined> | undefined, key: string): number {
  if (!scores) return 0;
  const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const value = scores[key] ?? scores[snake];
  const n = Number(value);
  return Number.isFinite(n) ? clamp(Math.round(n)) : 0;
}

function detectLanguage(messages: AdvancedAiMessage[]): string {
  const text = messages.map((message) => message.content).join(" ");
  if (/[అ-హా-ౌ్]/u.test(text)) return "Telugu";
  if (/[அ-ஹா-ௌ்]/u.test(text)) return "Tamil";
  if (/[अ-हाि-ौं्]/u.test(text)) return "Hindi";
  if (/\b(bhai|macha|nuvvu|arey|da|anna|ra)\b/i.test(text)) return "Mixed English";
  return "English";
}

function timeValue(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function messageAt(messages: AdvancedAiMessage[], event: MemoryEvent): string | null {
  return messages.find((message) => message.side === event.side && message.round === event.round)?.createdAt ?? null;
}

function offsetLabel(start: number, value?: string | null, fallbackSeconds = 0): string {
  const at = timeValue(value);
  const seconds = at && start ? Math.max(0, Math.round((at - start) / 1000)) : fallbackSeconds;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function s(count: number): string {
  return count === 1 ? "" : "s";
}
