import { buildAdvancedAiReport, type AdvancedAiReport } from "@/services/advancedAiSystems";

export type BattleDirectorStatus =
  | "waiting"
  | "active"
  | "judging"
  | "pending_review"
  | "completed"
  | "cancelled"
  | "expired"
  | "deleted";

export type BattleDirectorSide = "creator" | "opponent";

export interface BattleDirectorBattle {
  id: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: BattleDirectorStatus;
  rounds: number;
  winner_id: string | null;
  ai_summary: string | null;
  ai_scores: BattleAiScores | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  creator_id: string;
  creator_username: string;
  opponent_id: string | null;
  opponent_username: string | null;
}

export interface BattleDirectorMessage {
  id: string;
  content: string;
  round: number;
  created_at: string;
  user_id: string;
  username: string;
}

export interface BattleAiScores {
  creator?: Record<string, number>;
  opponent?: Record<string, number>;
  battleAnalysis?: Partial<BattleAiAnalysis>;
  feedback?: Partial<Record<BattleDirectorSide, string>>;
  rageMind?: {
    reasoningEngine?: {
      repeatedArguments?: string[];
      contradictions?: string[];
      ignoredQuestions?: string[];
      evidence?: string[];
      reasoning?: string;
    };
    playerDNA?: Partial<Record<BattleDirectorSide, { label?: string; traits?: string[] }>>;
    audienceSimulation?: {
      biggestLaugh?: string;
      mostSavageComeback?: string;
      mostConvincingArgument?: string;
      mostMemorableMoment?: string;
      mostShareableLine?: string;
      engagementScore?: number;
    };
  } | null;
  advancedSystems?: AdvancedAiReport | null;
  brainVersion?: string | null;
  panel?: unknown;
}

export interface BattleAiAnalysis {
  strongestArgument: string;
  weakestArgument: string;
  turningPoint: string;
  bestComeback: string;
  finalSummary: string;
  funniestMoment?: string;
  mostCreativeLine?: string;
  overallBattleQuality?: number;
  confidenceScore?: number;
  evidence?: string[];
  alternativeInterpretation?: string;
}

export interface DirectorPlayerState {
  side: BattleDirectorSide;
  userId: string | null;
  username: string;
  posts: number;
  remaining: number;
  lastRound: number | null;
  lastMessageAt: string | null;
  topicFit: number;
  pressure: number;
  stance: string;
  signals: string[];
  warnings: string[];
}

export interface DirectorLiveCheck {
  label: string;
  value: string;
  tone: "good" | "watch" | "alert" | "neutral";
  detail: string;
}

export interface DirectorReaction {
  type: "cheer" | "laugh" | "think" | "warn" | "predict";
  label: string;
  line: string;
  side: BattleDirectorSide | null;
}

export interface DirectorHighlight {
  label: string;
  value: string;
  side: BattleDirectorSide | null;
}

export interface DirectorScoreExplanation {
  metric: string;
  label: string;
  creatorScore: number;
  opponentScore: number;
  creatorExplanation: string;
  opponentExplanation: string;
}

export interface BattleDirectorReport {
  phase: "lobby" | "live" | "handoff" | "verdict" | "closed";
  statusLabel: string;
  directorLine: string;
  nextAction: string;
  roundState: {
    currentRound: number;
    totalRounds: number;
    creatorPosted: number;
    opponentPosted: number;
    waitingOn: string[];
    progress: number;
  };
  creator: DirectorPlayerState;
  opponent: DirectorPlayerState;
  liveChecks: DirectorLiveCheck[];
  reactions: DirectorReaction[];
  highlights: DirectorHighlight[];
  prediction: {
    leader: BattleDirectorSide | "draw" | null;
    leaderName: string;
    creatorWinChance: number;
    opponentWinChance: number;
    confidence: string;
    reason: string;
  };
  momentum: {
    leader: BattleDirectorSide | "draw" | null;
    score: number;
    reason: string;
  };
  memory: {
    currentDebate: string;
    repeatedArguments: string[];
    contradictions: string[];
    playerStyles: string[];
  };
  explainableScores: DirectorScoreExplanation[];
  advancedSystems: AdvancedAiReport;
}

const EXPLAINABLE_METRICS = [
  { key: "logic", label: "Logic" },
  { key: "relevance", label: "Relevance" },
  { key: "creativity", label: "Creativity" },
  { key: "counterarguments", label: "Counterarguments" },
  { key: "clarity", label: "Clarity" },
  { key: "audienceImpact", label: "Audience engagement" },
] as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "your",
  "you",
  "are",
  "was",
  "were",
  "from",
  "about",
  "battle",
  "debate",
  "roast",
]);

export function buildBattleDirectorReport(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  now = Date.now()
): BattleDirectorReport {
  const creatorMessages = messages.filter((message) => message.user_id === battle.creator_id);
  const opponentMessages = battle.opponent_id
    ? messages.filter((message) => message.user_id === battle.opponent_id)
    : [];

  const creator = buildPlayerState("creator", battle, creatorMessages, now);
  const opponent = buildPlayerState("opponent", battle, opponentMessages, now);
  const roundState = buildRoundState(battle, creator.posts, opponent.posts);
  const momentum = buildMomentum(battle, creatorMessages, opponentMessages);
  const prediction = buildPrediction(battle, creatorMessages, opponentMessages, momentum);
  const memory = buildMemory(battle, messages, creatorMessages, opponentMessages);
  const advancedSystems = battle.ai_scores?.advancedSystems ?? buildLiveAdvancedSystems(battle, messages);

  return {
    phase: phaseForStatus(battle.status),
    statusLabel: labelForStatus(battle.status),
    directorLine: buildDirectorLine(battle, roundState, prediction, memory),
    nextAction: buildNextAction(battle, roundState, creator, opponent),
    roundState,
    creator,
    opponent,
    liveChecks: buildLiveChecks(battle, messages, creator, opponent, memory, now),
    reactions: buildAudienceReactions(battle, messages, prediction),
    highlights: buildHighlights(battle, messages),
    prediction,
    momentum,
    memory,
    explainableScores: buildExplainableScores(battle),
    advancedSystems,
  };
}

function buildLiveAdvancedSystems(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[]
): AdvancedAiReport {
  return buildAdvancedAiReport({
    battle: {
      id: battle.id,
      title: battle.title,
      topic: battle.topic,
      battleType: battle.battle_type,
      mode: battle.mode,
      rounds: battle.rounds,
      status: battle.status,
      createdAt: battle.created_at,
      completedAt: battle.completed_at,
    },
    players: {
      creator: {
        side: "creator",
        userId: battle.creator_id,
        username: battle.creator_username,
      },
      opponent: {
        side: "opponent",
        userId: battle.opponent_id,
        username: battle.opponent_username ?? "Opponent",
      },
    },
    messages: messages.map((message) => ({
      side: message.user_id === battle.creator_id ? "creator" : "opponent",
      userId: message.user_id,
      username: message.username,
      content: message.content,
      round: message.round,
      createdAt: message.created_at,
    })),
    scores: {
      creator: battle.ai_scores?.creator,
      opponent: battle.ai_scores?.opponent,
      winner:
        battle.winner_id === battle.creator_id
          ? "creator"
          : battle.winner_id === battle.opponent_id
          ? "opponent"
          : battle.status === "completed"
          ? "draw"
          : undefined,
    },
  });
}

function buildPlayerState(
  side: BattleDirectorSide,
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  now: number
): DirectorPlayerState {
  const latest = messages[messages.length - 1] ?? null;
  const text = messages.map((message) => message.content).join(" ");
  const remaining = Math.max(0, battle.rounds - messages.length);
  const topicFit = estimateTopicFit(battle.topic, text, messages.length);
  const pressure = estimatePressure(messages, topicFit);
  const warnings = buildWarnings(battle, messages, topicFit, now);

  return {
    side,
    userId: side === "creator" ? battle.creator_id : battle.opponent_id,
    username: side === "creator" ? battle.creator_username : battle.opponent_username ?? "Opponent",
    posts: messages.length,
    remaining,
    lastRound: latest?.round ?? null,
    lastMessageAt: latest?.created_at ?? null,
    topicFit,
    pressure,
    stance: inferStance(text),
    signals: inferSignals(text),
    warnings,
  };
}

function buildRoundState(battle: BattleDirectorBattle, creatorPosted: number, opponentPosted: number) {
  const totalExpected = battle.opponent_id ? battle.rounds * 2 : battle.rounds;
  const totalPosted = creatorPosted + opponentPosted;
  const creatorDone = creatorPosted >= battle.rounds;
  const opponentDone = !battle.opponent_id || opponentPosted >= battle.rounds;
  const waitingOn: string[] = [];

  if (battle.status === "waiting") {
    waitingOn.push("opponent");
  } else if (battle.status === "active") {
    if (!creatorDone) waitingOn.push(battle.creator_username);
    if (battle.opponent_id && !opponentDone) waitingOn.push(battle.opponent_username ?? "opponent");
  }

  const nextCreatorRound = creatorDone ? battle.rounds : creatorPosted + 1;
  const nextOpponentRound = opponentDone ? battle.rounds : opponentPosted + 1;
  const currentRound = battle.status === "completed"
    ? battle.rounds
    : Math.max(1, Math.min(battle.rounds, Math.min(nextCreatorRound, nextOpponentRound)));

  return {
    currentRound,
    totalRounds: battle.rounds,
    creatorPosted,
    opponentPosted,
    waitingOn,
    progress: totalExpected > 0 ? clamp(Math.round((totalPosted / totalExpected) * 100), 0, 100) : 0,
  };
}

function buildMomentum(
  battle: BattleDirectorBattle,
  creatorMessages: BattleDirectorMessage[],
  opponentMessages: BattleDirectorMessage[]
): BattleDirectorReport["momentum"] {
  if (battle.status === "completed" && battle.winner_id) {
    const leader = battle.winner_id === battle.creator_id ? "creator" : "opponent";
    return {
      leader,
      score: 100,
      reason: `${nameForSide(battle, leader)} owns the final judged momentum.`,
    };
  }

  const creatorScore = sideLiveScore(battle.topic, creatorMessages);
  const opponentScore = sideLiveScore(battle.topic, opponentMessages);
  const delta = Math.abs(creatorScore - opponentScore);
  const leader = delta <= 3 ? "draw" : creatorScore > opponentScore ? "creator" : "opponent";

  return {
    leader,
    score: clamp(Math.round(50 + delta), 0, 100),
    reason:
      leader === "draw"
        ? "Momentum is close because both sides have similar live signal strength."
        : `${nameForSide(battle, leader)} has the stronger live mix of topic fit, counters, and audience pull.`,
  };
}

function buildPrediction(
  battle: BattleDirectorBattle,
  creatorMessages: BattleDirectorMessage[],
  opponentMessages: BattleDirectorMessage[],
  momentum: BattleDirectorReport["momentum"]
): BattleDirectorReport["prediction"] {
  if (battle.status === "waiting" || !battle.opponent_id) {
    return {
      leader: null,
      leaderName: "Waiting",
      creatorWinChance: 50,
      opponentWinChance: 50,
      confidence: "Low",
      reason: "Prediction opens once an opponent joins and both sides start creating signals.",
    };
  }

  if (battle.status === "completed") {
    const winner = battle.winner_id === battle.creator_id ? "creator" : battle.winner_id === battle.opponent_id ? "opponent" : "draw";
    return {
      leader: winner,
      leaderName: winner === "draw" ? "Draw" : nameForSide(battle, winner),
      creatorWinChance: winner === "creator" ? 100 : winner === "draw" ? 50 : 0,
      opponentWinChance: winner === "opponent" ? 100 : winner === "draw" ? 50 : 0,
      confidence: "Final",
      reason: battle.ai_summary ?? "The battle has been judged and locked.",
    };
  }

  const creatorScore = sideLiveScore(battle.topic, creatorMessages);
  const opponentScore = sideLiveScore(battle.topic, opponentMessages);
  const creatorWinChance = clamp(Math.round(50 + (creatorScore - opponentScore) * 0.45), 18, 82);
  const opponentWinChance = 100 - creatorWinChance;
  const leader = Math.abs(creatorWinChance - opponentWinChance) <= 6
    ? "draw"
    : creatorWinChance > opponentWinChance
    ? "creator"
    : "opponent";

  return {
    leader,
    leaderName: leader === "draw" ? "Even match" : nameForSide(battle, leader),
    creatorWinChance,
    opponentWinChance,
    confidence: confidenceFromMessages(creatorMessages.length + opponentMessages.length, battle.rounds * 2),
    reason: momentum.reason,
  };
}

function buildDirectorLine(
  battle: BattleDirectorBattle,
  roundState: BattleDirectorReport["roundState"],
  prediction: BattleDirectorReport["prediction"],
  memory: BattleDirectorReport["memory"]
): string {
  if (battle.status === "waiting") {
    return `Topic loaded: ${battle.topic}. The Director is holding the lobby until a challenger joins.`;
  }
  if (battle.status === "active") {
    const waiting = roundState.waitingOn.length ? `Waiting on ${roundState.waitingOn.join(" and ")}.` : "Both players are moving.";
    return `Round ${roundState.currentRound}/${battle.rounds} is live. ${waiting}`;
  }
  if (battle.status === "judging" || battle.status === "pending_review") {
    return "Transcript complete. The Director has handed the battle to the AI Judge.";
  }
  if (battle.status === "completed") {
    return `Verdict locked: ${prediction.leaderName}. ${memory.currentDebate}`;
  }
  if (battle.status === "deleted") {
    return "This battle is removed from public view, but the preserved transcript can still be reviewed.";
  }
  return "This battle is closed.";
}

function buildNextAction(
  battle: BattleDirectorBattle,
  roundState: BattleDirectorReport["roundState"],
  creator: DirectorPlayerState,
  opponent: DirectorPlayerState
): string {
  if (battle.status === "waiting") return "Invite an opponent or share the battle code.";
  if (battle.status === "active") {
    if (roundState.waitingOn.length) {
      return `${roundState.waitingOn.join(" and ")} should post the next on-topic response.`;
    }
    return "All live turns are in. Prepare for AI judging.";
  }
  if (battle.status === "judging" || battle.status === "pending_review") return "Run the AI Judge to publish the verdict.";
  if (battle.status === "completed") {
    const weaker = creator.pressure <= opponent.pressure ? creator : opponent;
    return `${weaker.username} should study the coach notes and target ${weaker.signals[0] ?? "cleaner rebuttals"} next battle.`;
  }
  return "No player action needed.";
}

function buildLiveChecks(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  creator: DirectorPlayerState,
  opponent: DirectorPlayerState,
  memory: BattleDirectorReport["memory"],
  now: number
): DirectorLiveCheck[] {
  const latest = messages[messages.length - 1] ?? null;
  const lastAgeSeconds = latest ? (now - new Date(latest.created_at).getTime()) / 1000 : null;
  const lowTopic = [creator, opponent].filter((player) => player.posts > 0 && player.topicFit < 45);
  const stalling = battle.status === "active" && lastAgeSeconds !== null && lastAgeSeconds > 180;

  return [
    {
      label: "Topic lock",
      value: lowTopic.length ? "Watch" : "Clean",
      tone: lowTopic.length ? "watch" : "good",
      detail: lowTopic.length
        ? `${lowTopic.map((player) => player.username).join(" and ")} may be drifting from ${battle.topic}.`
        : "Recent responses are close enough to the topic signal.",
    },
    {
      label: "Pace",
      value: stalling ? "Slow" : battle.status === "active" ? "Live" : "Stable",
      tone: stalling ? "watch" : "neutral",
      detail: stalling
        ? "The Director would warn players to keep the round moving."
        : "No stalling pattern is visible right now.",
    },
    {
      label: "Repetition",
      value: memory.repeatedArguments.length ? "Flagged" : "Clear",
      tone: memory.repeatedArguments.length ? "watch" : "good",
      detail: memory.repeatedArguments[0] ?? "No repeated argument pattern detected.",
    },
    {
      label: "Safety",
      value: messages.some((message) => severeSafetyPattern(message.content)) ? "Review" : "Clear",
      tone: messages.some((message) => severeSafetyPattern(message.content)) ? "alert" : "good",
      detail: "Moderator checks stay focused on threats, hate, spam, and targeted harassment.",
    },
  ];
}

function buildAudienceReactions(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  prediction: BattleDirectorReport["prediction"]
): DirectorReaction[] {
  const latest = messages[messages.length - 1] ?? null;
  const funniest = topMessage(messages, humorScore);
  const strongest = topMessage(messages, (message) => logicScore(message.content));
  const reactions: DirectorReaction[] = [];

  if (latest) {
    reactions.push({
      type: /lol|haha|cook|cooked|ratio|wild|bro/i.test(latest.content) ? "laugh" : "cheer",
      label: "AI spectator",
      line: `"${truncate(latest.content, 92)}" landed as the freshest moment.`,
      side: sideForUser(battle, latest.user_id),
    });
  }

  if (funniest) {
    reactions.push({
      type: "laugh",
      label: "AI spectator",
      line: `Biggest laugh watch: ${funniest.username}'s round ${funniest.round} line.`,
      side: sideForUser(battle, funniest.user_id),
    });
  }

  if (strongest && strongest.id !== funniest?.id) {
    reactions.push({
      type: "think",
      label: "AI spectator",
      line: `${strongest.username} is carrying the strongest reasoning signal so far.`,
      side: sideForUser(battle, strongest.user_id),
    });
  }

  reactions.push({
    type: "predict",
    label: "AI spectator",
    line:
      prediction.leader === "draw"
        ? "This is still too close to call."
        : `${prediction.leaderName} has the live edge, but the next round can flip it.`,
    side: prediction.leader === "draw" ? null : prediction.leader,
  });

  return reactions.slice(0, 4);
}

function buildHighlights(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[]
): DirectorHighlight[] {
  const analysis = battle.ai_scores?.battleAnalysis;
  const rageAudience = battle.ai_scores?.rageMind?.audienceSimulation;
  const strongest = topMessage(messages, (message) => logicScore(message.content));
  const funniest = topMessage(messages, humorScore);
  const comeback = topMessage(messages, comebackScore);

  return [
    {
      label: "Funniest moment",
      value: analysis?.funniestMoment || rageAudience?.biggestLaugh || lineForMessage(funniest) || "Waiting for a laugh spike.",
      side: sideForUser(battle, funniest?.user_id ?? null),
    },
    {
      label: "Strongest argument",
      value: analysis?.strongestArgument || rageAudience?.mostConvincingArgument || lineForMessage(strongest) || "No strong argument yet.",
      side: sideForUser(battle, strongest?.user_id ?? null),
    },
    {
      label: "Best comeback",
      value: analysis?.bestComeback || rageAudience?.mostSavageComeback || lineForMessage(comeback) || "No comeback has separated yet.",
      side: sideForUser(battle, comeback?.user_id ?? null),
    },
    {
      label: "Turning point",
      value: analysis?.turningPoint || inferTurningPoint(messages),
      side: null,
    },
    {
      label: "Final knockout",
      value: battle.status === "completed" ? battle.ai_summary ?? analysis?.finalSummary ?? "Verdict complete." : "Not decided yet.",
      side: battle.winner_id ? sideForUser(battle, battle.winner_id) : null,
    },
  ];
}

function buildMemory(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  creatorMessages: BattleDirectorMessage[],
  opponentMessages: BattleDirectorMessage[]
): BattleDirectorReport["memory"] {
  const repeatedFromRageMind = battle.ai_scores?.rageMind?.reasoningEngine?.repeatedArguments ?? [];
  const contradictionsFromRageMind = battle.ai_scores?.rageMind?.reasoningEngine?.contradictions ?? [];
  const playerDna = battle.ai_scores?.rageMind?.playerDNA;
  const playerStyles = [
    playerDna?.creator?.label ? `${battle.creator_username}: ${playerDna.creator.label}` : inferStyleLabel(battle.creator_username, creatorMessages),
    battle.opponent_username
      ? playerDna?.opponent?.label
        ? `${battle.opponent_username}: ${playerDna.opponent.label}`
        : inferStyleLabel(battle.opponent_username, opponentMessages)
      : "Opponent style: waiting for data",
  ];

  return {
    currentDebate: `Memory tracked ${messages.length} message${messages.length === 1 ? "" : "s"} across ${battle.rounds} round${battle.rounds === 1 ? "" : "s"}.`,
    repeatedArguments: [...repeatedFromRageMind, ...detectRepeatedArguments(messages)].slice(0, 3),
    contradictions: [...contradictionsFromRageMind, ...detectContradictions(messages)].slice(0, 3),
    playerStyles,
  };
}

function buildExplainableScores(battle: BattleDirectorBattle): DirectorScoreExplanation[] {
  const creatorScores = battle.ai_scores?.creator;
  const opponentScores = battle.ai_scores?.opponent;
  if (!creatorScores || !opponentScores) return [];

  return EXPLAINABLE_METRICS.map((metric) => {
    const creatorScore = metric.key === "clarity"
      ? clarityScore(creatorScores)
      : readScore(creatorScores, metric.key);
    const opponentScore = metric.key === "clarity"
      ? clarityScore(opponentScores)
      : readScore(opponentScores, metric.key);

    return {
      metric: metric.key,
      label: metric.label,
      creatorScore,
      opponentScore,
      creatorExplanation: explainScore(metric.key, creatorScore, "creator", battle),
      opponentExplanation: explainScore(metric.key, opponentScore, "opponent", battle),
    };
  }).filter((entry) => entry.creatorScore > 0 || entry.opponentScore > 0);
}

function phaseForStatus(status: BattleDirectorStatus): BattleDirectorReport["phase"] {
  if (status === "waiting") return "lobby";
  if (status === "active") return "live";
  if (status === "judging" || status === "pending_review") return "handoff";
  if (status === "completed") return "verdict";
  return "closed";
}

function labelForStatus(status: BattleDirectorStatus): string {
  const labels: Record<BattleDirectorStatus, string> = {
    waiting: "Lobby control",
    active: "Live referee",
    judging: "Judge handoff",
    pending_review: "Review queue",
    completed: "Verdict replay",
    cancelled: "Cancelled",
    expired: "Expired",
    deleted: "Removed",
  };
  return labels[status];
}

function estimateTopicFit(topic: string, text: string, messageCount: number): number {
  if (messageCount === 0) return 50;
  const topicTokens = keywordTokens(topic);
  if (topicTokens.length === 0) return 60;
  const lower = text.toLowerCase();
  const hits = topicTokens.filter((token) => lower.includes(token)).length;
  const logicBoost = /\b(because|therefore|evidence|reason|point|actually)\b/i.test(text) ? 10 : 0;
  return clamp(34 + hits * 18 + logicBoost + Math.min(16, text.length / 80), 0, 100);
}

function estimatePressure(messages: BattleDirectorMessage[], topicFit: number): number {
  const text = messages.map((message) => message.content).join(" ");
  const punctuation = (text.match(/[!?]/g)?.length ?? 0) * 3;
  const counter = (text.match(/\b(but|actually|still|you said|your point|because)\b/gi)?.length ?? 0) * 6;
  const length = Math.min(18, text.length / 70);
  return clamp(Math.round(topicFit * 0.45 + punctuation + counter + length), 0, 100);
}

function buildWarnings(
  battle: BattleDirectorBattle,
  messages: BattleDirectorMessage[],
  topicFit: number,
  now: number
): string[] {
  const warnings: string[] = [];
  const latest = messages[messages.length - 1] ?? null;
  if (messages.length > 0 && topicFit < 42) warnings.push(`Needs a clearer link back to ${battle.topic}.`);
  if (latest && latest.content.trim().length < 18) warnings.push("Short response; add substance before the next round.");
  if (hasRepeatedOwnLine(messages)) warnings.push("Repeated phrasing detected.");
  if (battle.status === "active" && latest && now - new Date(latest.created_at).getTime() > 3 * 60 * 1000) {
    warnings.push("May be stalling; timer pressure is rising.");
  }
  return warnings.slice(0, 3);
}

function inferStance(text: string): string {
  if (!text.trim()) return "Learning";
  if (/\b(because|evidence|reason|therefore|logic)\b/i.test(text)) return "Argument-first";
  if (/\b(lol|haha|cook|cooked|ratio|wild|bro)\b/i.test(text)) return "Comedy pressure";
  if (/\b(but|actually|you said|your point|still)\b/i.test(text)) return "Counterpunching";
  return text.length > 180 ? "Long-form pressure" : "Quick hits";
}

function inferSignals(text: string): string[] {
  const signals: string[] = [];
  if (/\b(because|evidence|reason|therefore|logic|point)\b/i.test(text)) signals.push("logic");
  if (/\b(but|actually|you said|your point|still)\b/i.test(text)) signals.push("counters");
  if (/\b(lol|haha|cook|cooked|ratio|wild|bro)\b/i.test(text)) signals.push("humor");
  if (/[!?]/.test(text)) signals.push("energy");
  if (text.length > 260) signals.push("depth");
  return signals.length ? signals.slice(0, 4) : ["baseline"];
}

function sideLiveScore(topic: string, messages: BattleDirectorMessage[]): number {
  if (messages.length === 0) return 42;
  const text = messages.map((message) => message.content).join(" ");
  return clamp(
    Math.round(
      estimateTopicFit(topic, text, messages.length) * 0.34 +
        estimatePressure(messages, estimateTopicFit(topic, text, messages.length)) * 0.32 +
        Math.min(22, text.length / 65) +
        Math.min(12, messages.length * 3)
    ),
    0,
    100
  );
}

function confidenceFromMessages(totalMessages: number, expectedMessages: number): string {
  const progress = expectedMessages > 0 ? totalMessages / expectedMessages : 0;
  if (progress >= 0.8) return "High";
  if (progress >= 0.4) return "Medium";
  return "Low";
}

function explainScore(
  metric: (typeof EXPLAINABLE_METRICS)[number]["key"],
  score: number,
  side: BattleDirectorSide,
  battle: BattleDirectorBattle
): string {
  const name = nameForSide(battle, side);
  const band = score >= 85 ? "excellent" : score >= 70 ? "strong" : score >= 50 ? "mixed" : "weak";
  const analysis = battle.ai_scores?.battleAnalysis;
  const feedback = battle.ai_scores?.feedback?.[side];
  const evidence = feedback || analysis?.evidence?.[0] || analysis?.finalSummary;

  const metricReason: Record<typeof metric, string> = {
    logic: "claim structure, reasoning words, and whether points connected cleanly",
    relevance: "how often the response stayed tied to the battle topic",
    creativity: "fresh wording, unexpected angles, and memorable framing",
    counterarguments: "direct replies to the opponent instead of isolated monologues",
    clarity: "readability, consistency, and conversation flow",
    audienceImpact: "laughs, shareable lines, pressure, and crowd pull",
  };

  return `${name} was ${band} here (${score}/100), based on ${metricReason[metric]}.${
    evidence ? ` ${truncate(evidence, 150)}` : ""
  }`;
}

function clarityScore(scores: Record<string, unknown>): number {
  const consistency = readScore(scores, "consistency");
  const flow = readScore(scores, "conversationFlow");
  const confidence = readScore(scores, "confidence");
  const values = [consistency, flow, confidence].filter((value) => value > 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function readScore(scores: Record<string, unknown>, key: string): number {
  const camel = scores[key];
  const snake = scores[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
  const n = Number(camel ?? snake ?? 0);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, 100) : 0;
}

function topMessage(
  messages: BattleDirectorMessage[],
  scorer: (message: BattleDirectorMessage) => number
): BattleDirectorMessage | null {
  if (messages.length === 0) return null;
  return [...messages].sort((a, b) => scorer(b) - scorer(a))[0] ?? null;
}

function humorScore(message: BattleDirectorMessage): number {
  return (
    message.content.length / 8 +
    (/\b(lol|haha|cook|cooked|ratio|wild|bro|macha|bhai|peak)\b/i.test(message.content) ? 24 : 0) +
    (message.content.match(/[!?]/g)?.length ?? 0) * 4
  );
}

function logicScore(content: string): number {
  return (content.match(/\b(because|logic|evidence|reason|therefore|point|proof)\b/gi)?.length ?? 0) * 16 + content.length / 14;
}

function comebackScore(message: BattleDirectorMessage): number {
  return (
    (message.content.match(/\b(but|actually|still|you said|your point|at least|and yet)\b/gi)?.length ?? 0) * 18 +
    humorScore(message) * 0.45
  );
}

function lineForMessage(message: BattleDirectorMessage | null): string {
  return message ? `${message.username}: "${truncate(message.content, 120)}"` : "";
}

function inferTurningPoint(messages: BattleDirectorMessage[]): string {
  if (messages.length < 3) return "Not enough transcript yet for a real turning point.";
  const middle = messages[Math.floor(messages.length / 2)];
  return `Watch round ${middle.round}, where the exchange starts to reveal momentum.`;
}

function detectRepeatedArguments(messages: BattleDirectorMessage[]): string[] {
  const notes: string[] = [];
  const byUser = new Map<string, BattleDirectorMessage[]>();
  for (const message of messages) byUser.set(message.user_id, [...(byUser.get(message.user_id) ?? []), message]);

  for (const userMessages of byUser.values()) {
    for (let i = 0; i < userMessages.length; i++) {
      for (let j = i + 1; j < userMessages.length; j++) {
        if (overlapRatio(userMessages[i].content, userMessages[j].content) > 0.55) {
          notes.push(`${userMessages[i].username} repeated a similar angle in rounds ${userMessages[i].round} and ${userMessages[j].round}.`);
        }
      }
    }
  }

  return notes;
}

function detectContradictions(messages: BattleDirectorMessage[]): string[] {
  const notes: string[] = [];
  const byUser = new Map<string, string[]>();
  for (const message of messages) byUser.set(message.user_id, [...(byUser.get(message.user_id) ?? []), message.content.toLowerCase()]);

  for (const [userId, lines] of byUser) {
    const username = messages.find((message) => message.user_id === userId)?.username ?? "A player";
    const text = lines.join(" ");
    if (/\balways\b/.test(text) && /\bnever\b/.test(text)) {
      notes.push(`${username} used absolute claims that may need consistency review.`);
    }
  }

  return notes;
}

function inferStyleLabel(username: string, messages: BattleDirectorMessage[]): string {
  const text = messages.map((message) => message.content).join(" ");
  const style = inferStance(text);
  return `${username}: ${style}`;
}

function hasRepeatedOwnLine(messages: BattleDirectorMessage[]): boolean {
  for (let i = 0; i < messages.length; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      if (overlapRatio(messages[i].content, messages[j].content) > 0.62) return true;
    }
  }
  return false;
}

function keywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 8);
}

function overlapRatio(a: string, b: string): number {
  const aTokens = new Set(keywordTokens(a));
  const bTokens = new Set(keywordTokens(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let shared = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) shared++;
  }
  return shared / Math.min(aTokens.size, bTokens.size);
}

function sideForUser(battle: BattleDirectorBattle, userId: string | null): BattleDirectorSide | null {
  if (!userId) return null;
  if (userId === battle.creator_id) return "creator";
  if (userId === battle.opponent_id) return "opponent";
  return null;
}

function nameForSide(battle: BattleDirectorBattle, side: BattleDirectorSide): string {
  return side === "creator" ? battle.creator_username : battle.opponent_username ?? "Opponent";
}

function severeSafetyPattern(content: string): boolean {
  return /\b(kill yourself|doxx|address leak|nazi|terrorist)\b/i.test(content);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
