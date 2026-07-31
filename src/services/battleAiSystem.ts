import { sql } from "@/lib/db";
import { analyzeMessage } from "@/services/aiModerator";
import { selfTestJudge, type JudgeResult } from "@/services/aiJudge";

export type BattleAiDifficulty =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Grandmaster"
  | "Legend"
  | "Mythic";

export type BattleAiLanguage =
  | "Auto"
  | "English"
  | "Hindi"
  | "Hinglish"
  | "Telugu"
  | "Tamil"
  | "Kannada"
  | "Malayalam"
  | "Marathi"
  | "Punjabi"
  | "Urdu";

type AiOpponent = {
  slug: string;
  display_name: string;
  title: string;
  personality: string;
  vocabulary: string[];
  humor_style: string;
  aggression: number;
  knowledge_domains: string[];
  confidence: number;
  reasoning: number;
  creativity: number;
  memory: number;
  language_preference: string;
  avatar_url: string;
};

type AiBattleRow = {
  id: string;
  player_id: string;
  opponent_slug: string;
  title: string;
  topic: string;
  difficulty: BattleAiDifficulty;
  language_mode: BattleAiLanguage;
  status: "active" | "completed" | "abandoned";
  rounds: number;
  current_round: number;
  transcript: unknown;
  judge_result: unknown;
  winner: "player" | "ai" | "draw" | null;
  quality_report: unknown;
  reward_result: unknown;
  ai_disclosure: string;
  created_at: string;
  completed_at: string | null;
};

const DIFFICULTY_CONFIG: Record<BattleAiDifficulty, { multiplier: number; depth: number; speed: string; baseAura: number; baseXp: number; baseCoins: number }> = {
  Bronze: { multiplier: 0.6, depth: 1, speed: "relaxed", baseAura: 18, baseXp: 25, baseCoins: 10 },
  Silver: { multiplier: 0.8, depth: 1, speed: "steady", baseAura: 24, baseXp: 35, baseCoins: 14 },
  Gold: { multiplier: 1, depth: 2, speed: "steady", baseAura: 32, baseXp: 48, baseCoins: 18 },
  Platinum: { multiplier: 1.25, depth: 2, speed: "fast", baseAura: 42, baseXp: 64, baseCoins: 24 },
  Diamond: { multiplier: 1.55, depth: 3, speed: "fast", baseAura: 54, baseXp: 82, baseCoins: 32 },
  Master: { multiplier: 1.9, depth: 3, speed: "sharp", baseAura: 68, baseXp: 105, baseCoins: 42 },
  Grandmaster: { multiplier: 2.25, depth: 4, speed: "sharp", baseAura: 84, baseXp: 132, baseCoins: 54 },
  Legend: { multiplier: 2.7, depth: 4, speed: "blistering", baseAura: 105, baseXp: 165, baseCoins: 70 },
  Mythic: { multiplier: 3.2, depth: 5, speed: "blistering", baseAura: 130, baseXp: 210, baseCoins: 90 },
};

const DAILY_AI_AURA_CAP = 300;
const LOW_QUALITY_NO_AURA = 25;
const REDUCED_REWARD_QUALITY = 50;
const SYSTEM_AI_ID = "00000000-0000-0000-0000-0000000000aa";

const FALLBACK_TOPICS = [
  "Android vs iPhone",
  "Anime heroes vs movie heroes",
  "Gaming skill vs study discipline",
  "Tea vs coffee",
  "AI tools in college",
  "Corporate life vs startup chaos",
  "Street food vs fine dining",
  "Cricket pressure vs football pressure",
  "Memes as modern philosophy",
  "Remote work vs office work",
];

const CATALOG_DIFFICULTIES = Object.entries(DIFFICULTY_CONFIG).map(([name, config]) => ({
  name,
  multiplier: config.multiplier,
  speed: config.speed,
  depth: config.depth,
}));

const CATALOG_LANGUAGES: BattleAiLanguage[] = [
  "Auto",
  "English",
  "Hindi",
  "Hinglish",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Punjabi",
  "Urdu",
];

const FALLBACK_OPPONENTS: AiOpponent[] = [
  {
    slug: "sigma-king",
    display_name: "Sigma King",
    title: "calm confidence merchant",
    personality: "Unbothered, concise, status-game aware, allergic to excuses.",
    vocabulary: ["grindset", "discipline", "focus", "aura", "clean win"],
    humor_style: "deadpan confidence",
    aggression: 62,
    knowledge_domains: ["motivation", "internet culture", "self improvement"],
    confidence: 88,
    reasoning: 72,
    creativity: 68,
    memory: 70,
    language_preference: "Hinglish",
    avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=sigma-king",
  },
  {
    slug: "dark-roaster",
    display_name: "Dark Roaster",
    title: "sharp roast specialist",
    personality: "Edgy but policy-safe, surgical, loves callbacks.",
    vocabulary: ["cooked", "plot twist", "receipt", "checkpoint", "shadow"],
    humor_style: "dark dry humor",
    aggression: 82,
    knowledge_domains: ["memes", "roasting", "internet culture"],
    confidence: 78,
    reasoning: 66,
    creativity: 84,
    memory: 75,
    language_preference: "English",
    avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=dark-roaster",
  },
  {
    slug: "anime-master",
    display_name: "Anime Master",
    title: "shonen logic analyst",
    personality: "Frames every argument like an arc, power scale, or final boss fight.",
    vocabulary: ["arc", "canon", "power-up", "main character", "filler"],
    humor_style: "anime references",
    aggression: 58,
    knowledge_domains: ["anime", "manga", "gaming", "storytelling"],
    confidence: 76,
    reasoning: 74,
    creativity: 82,
    memory: 78,
    language_preference: "English",
    avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=anime-master",
  },
  {
    slug: "coder",
    display_name: "Coder",
    title: "debugger of weak logic",
    personality: "Treats every bad point like a failing test case.",
    vocabulary: ["bug", "runtime", "stack trace", "edge case", "patch"],
    humor_style: "technical snark",
    aggression: 52,
    knowledge_domains: ["programming", "technology", "gaming"],
    confidence: 70,
    reasoning: 86,
    creativity: 70,
    memory: 78,
    language_preference: "English",
    avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=coder",
  },
  {
    slug: "memelord",
    display_name: "Memelord",
    title: "reference storm engine",
    personality: "Lives on reaction images, compressed slang, and chaotic callbacks.",
    vocabulary: ["ratio", "npc", "canon event", "skill issue", "delulu"],
    humor_style: "meme chaos",
    aggression: 76,
    knowledge_domains: ["memes", "gaming", "internet culture"],
    confidence: 78,
    reasoning: 62,
    creativity: 92,
    memory: 68,
    language_preference: "Hinglish",
    avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=memelord",
  },
];

function catalogPayload(opponents: AiOpponent[], source: "database" | "fallback") {
  return {
    disclosure: "Battle AI is always clearly labelled. These opponents are AI personalities, never real players.",
    difficulties: CATALOG_DIFFICULTIES,
    languages: CATALOG_LANGUAGES,
    suggestedTopics: FALLBACK_TOPICS,
    opponents,
    source,
  };
}

export async function getBattleAiCatalog() {
  try {
    const rows = await sql`
      SELECT slug, display_name, title, personality, vocabulary, humor_style, aggression,
             knowledge_domains, confidence, reasoning, creativity, memory, language_preference, avatar_url
      FROM ai_opponents
      WHERE is_active = TRUE
      ORDER BY display_name ASC
    `;
    const opponents = rows.map(normalizeOpponent);
    return catalogPayload(opponents.length ? opponents : FALLBACK_OPPONENTS, opponents.length ? "database" : "fallback");
  } catch (err) {
    console.warn("Battle AI catalog fallback used:", err);
    return catalogPayload(FALLBACK_OPPONENTS, "fallback");
  }
}

export async function listPlayerAiBattles(userId: string) {
  const rows = await sql`
    SELECT b.id, b.title, b.topic, b.difficulty, b.language_mode, b.status, b.rounds,
           b.winner, b.reward_result, b.created_at, b.completed_at,
           o.slug, o.display_name, o.avatar_url
    FROM ai_battles b
    JOIN ai_opponents o ON o.slug = b.opponent_slug
    WHERE b.player_id = ${userId}
    ORDER BY b.created_at DESC
    LIMIT 12
  `;
  return rows;
}

export async function startBattleAi(input: {
  userId: string;
  opponentSlug: string;
  difficulty: BattleAiDifficulty;
  languageMode: BattleAiLanguage;
  topic: string;
  rounds: number;
}) {
  const opponent = await getOpponent(input.opponentSlug);
  if (!opponent) throw new Error("AI opponent not found.");

  const safeRounds = Math.max(1, Math.min(5, input.rounds));
  const topic = input.topic.trim() || pick(FALLBACK_TOPICS);
  const title = `${opponent.display_name} AI Battle: ${topic}`;
  const rows = await sql`
    INSERT INTO ai_battles
      (player_id, opponent_slug, title, topic, difficulty, language_mode, rounds, ai_disclosure)
    VALUES
      (${input.userId}, ${opponent.slug}, ${title}, ${topic}, ${input.difficulty},
       ${input.languageMode}, ${safeRounds}, 'This is Battle AI: a clearly labelled player-vs-AI match.')
    RETURNING *
  `;

  return getBattleAi(rows[0].id, input.userId);
}

export async function getBattleAi(battleId: string, userId: string) {
  const battleRows = await sql`
    SELECT *
    FROM ai_battles
    WHERE id = ${battleId} AND player_id = ${userId}
    LIMIT 1
  `;
  if (battleRows.length === 0) return null;

  const battle = battleRows[0] as AiBattleRow;
  const opponent = await getOpponent(String(battle.opponent_slug));
  const messages = await sql`
    SELECT id, sender_type, content, round, language_mode, metadata, created_at
    FROM ai_battle_messages
    WHERE ai_battle_id = ${battleId}
    ORDER BY created_at ASC
  `;
  const rewardRows = await sql`
    SELECT *
    FROM ai_battle_rewards
    WHERE ai_battle_id = ${battleId}
    LIMIT 1
  `;

  return {
    battle,
    opponent,
    messages,
    reward: rewardRows[0] ?? null,
    disclosure: battle.ai_disclosure,
  };
}

export async function postBattleAiMessage(input: {
  userId: string;
  username: string;
  battleId: string;
  content: string;
}) {
  const loaded = await getBattleAi(input.battleId, input.userId);
  if (!loaded) throw new Error("Battle AI match not found.");
  const battle = loaded.battle as AiBattleRow;
  const opponent = loaded.opponent as AiOpponent | null;
  if (!opponent) throw new Error("AI opponent not found.");
  if (battle.status !== "active") throw new Error("This Battle AI match is already complete.");

  const previousPlayerMessages = loaded.messages
    .filter((message: any) => message.sender_type === "player")
    .map((message: any) => String(message.content));
  const round = previousPlayerMessages.length + 1;
  if (round > Number(battle.rounds)) throw new Error("You have already posted all rounds.");

  const verdict = await analyzeMessage(input.content, {
    recentMessages: previousPlayerMessages,
    battleTopic: battle.topic,
    battleType: "PLAYER_VS_AI",
    mode: "text",
    senderUsername: input.username,
    opponentUsername: opponent.display_name,
    conversationHistory: loaded.messages.map((message: any) => ({
      username: message.sender_type === "player" ? input.username : opponent.display_name,
      content: String(message.content),
    })),
  });
  if (verdict.action === "BLOCK") {
    return {
      blocked: true,
      warning: null,
      moderation: verdict,
      battle: loaded,
    };
  }

  const qualityBeforeReply = evaluatePlayerQuality([...previousPlayerMessages, input.content]);
  await sql`
    INSERT INTO ai_battle_messages (ai_battle_id, sender_type, content, round, language_mode, metadata)
    VALUES (${battle.id}, 'player', ${input.content}, ${round}, ${battle.language_mode}, ${JSON.stringify({ moderation: verdict, quality: qualityBeforeReply })})
  `;

  const refreshedMessages = [
    ...loaded.messages.map((message: any) => ({
      sender_type: String(message.sender_type),
      content: String(message.content),
      round: Number(message.round),
    })),
    { sender_type: "player", content: input.content, round },
  ];
  const aiReply = composeAiReply({
    playerName: input.username,
    opponent,
    battle,
    messages: refreshedMessages,
    playerMessage: input.content,
    round,
  });

  await sql`
    INSERT INTO ai_battle_messages (ai_battle_id, sender_type, content, round, language_mode, metadata)
    VALUES (${battle.id}, 'ai', ${aiReply.content}, ${round}, ${battle.language_mode}, ${JSON.stringify(aiReply.metadata)})
  `;

  let completed = null;
  if (round >= Number(battle.rounds)) {
    completed = await completeBattleAi(battle.id, input.userId, input.username, opponent);
  } else {
    await sql`
      UPDATE ai_battles
      SET current_round = ${round + 1}
      WHERE id = ${battle.id}
    `;
  }

  return {
    blocked: false,
    warning: verdict.action === "WARN" ? verdict : null,
    moderation: verdict,
    battle: completed ?? (await getBattleAi(battle.id, input.userId)),
  };
}

async function completeBattleAi(battleId: string, userId: string, username: string, opponent: AiOpponent) {
  const battleRows = await sql`SELECT * FROM ai_battles WHERE id = ${battleId} AND player_id = ${userId} LIMIT 1`;
  if (battleRows.length === 0) throw new Error("Battle AI match not found.");
  const battle = battleRows[0] as AiBattleRow;
  const messages = await sql`
    SELECT sender_type, content, round, created_at
    FROM ai_battle_messages
    WHERE ai_battle_id = ${battleId}
    ORDER BY created_at ASC
  `;

  const judge = await selfTestJudge({
    topic: battle.topic,
    title: battle.title,
    battleType: "PLAYER_VS_AI",
    mode: "text",
    creatorId: userId,
    opponentId: SYSTEM_AI_ID,
    creatorName: username,
    opponentName: opponent.display_name,
    messages: messages.map((message: any) => ({
      user_id: message.sender_type === "player" ? userId : SYSTEM_AI_ID,
      content: String(message.content),
      round: Number(message.round),
      created_at: message.created_at ? String(message.created_at) : undefined,
    })),
  });

  const qualityReport = evaluateBattleQuality(messages.map((message: any) => String(message.content)), judge);
  const winner = judge.winner === "creator" ? "player" : judge.winner === "opponent" ? "ai" : "draw";
  const reward = await applyBattleAiRewards({
    battleId,
    userId,
    winner,
    judge,
    qualityReport,
    difficulty: battle.difficulty,
  });

  await sql`
    UPDATE ai_battles
    SET status = 'completed',
        completed_at = now(),
        transcript = ${JSON.stringify(messages)},
        judge_result = ${JSON.stringify(judge)},
        winner = ${winner},
        quality_report = ${JSON.stringify(qualityReport)},
        reward_result = ${JSON.stringify(reward)},
        offline_learning_status = ${qualityReport.qualityScore >= 70 ? "pending_validation" : "rejected_low_quality"}
    WHERE id = ${battleId}
  `;

  if (qualityReport.qualityScore >= 70) {
    await sql`
      INSERT INTO ai_battle_learning_candidates
        (ai_battle_id, quality_score, extracted_patterns)
      VALUES
        (${battleId}, ${qualityReport.qualityScore}, ${JSON.stringify(qualityReport.learningPatterns)})
      ON CONFLICT (ai_battle_id) DO UPDATE SET
        quality_score = EXCLUDED.quality_score,
        extracted_patterns = EXCLUDED.extracted_patterns,
        status = 'pending_validation',
        created_at = now()
    `;
  }

  return getBattleAi(battleId, userId);
}

async function applyBattleAiRewards(input: {
  battleId: string;
  userId: string;
  winner: "player" | "ai" | "draw";
  judge: JudgeResult;
  qualityReport: ReturnType<typeof evaluateBattleQuality>;
  difficulty: BattleAiDifficulty;
}) {
  const config = DIFFICULTY_CONFIG[input.difficulty];
  const playerScore = input.judge.scores.creator.total;
  const performanceRating = Math.round(playerScore * config.multiplier);
  const quality = input.qualityReport.qualityScore;
  const dayRows = await sql`
    SELECT aura_awarded, battles_completed, low_quality_count
    FROM ai_battle_daily_usage
    WHERE user_id = ${input.userId} AND day = CURRENT_DATE
    LIMIT 1
  `;
  const usedAura = Number(dayRows[0]?.aura_awarded ?? 0);
  const capRemaining = Math.max(0, DAILY_AI_AURA_CAP - usedAura);

  let aura = 0;
  let xp = Math.round(config.baseXp * Math.max(0.35, quality / 100));
  let coins = Math.round(config.baseCoins * Math.max(0.25, quality / 100));
  const reasons: string[] = [];

  if (input.winner === "player") {
    aura = Math.round(config.baseAura * config.multiplier * Math.max(0, quality / 100));
  } else if (input.winner === "draw") {
    aura = Math.round(config.baseAura * 0.25 * Math.max(0, quality / 100));
  }

  if (quality < LOW_QUALITY_NO_AURA) {
    reasons.push("No Aura: battle quality was extremely poor.");
    aura = 0;
    xp = Math.min(xp, 8);
    coins = 0;
  } else if (quality < REDUCED_REWARD_QUALITY) {
    reasons.push("Rewards reduced for repeated, short, or low-effort messages.");
    aura = Math.round(aura * 0.35);
    xp = Math.round(xp * 0.5);
    coins = Math.round(coins * 0.5);
  }

  if (input.qualityReport.copyPasteDetected) {
    reasons.push("Copy-paste pattern detected.");
    aura = Math.round(aura * 0.4);
  }
  if (input.qualityReport.intentionalLosingSuspected) {
    reasons.push("Intentional losing or AFK pattern suspected.");
    aura = 0;
  }
  if (aura > capRemaining) {
    reasons.push("Daily Battle AI Aura cap reached.");
    aura = capRemaining;
  }

  const achievements = buildAchievements(input.winner, input.difficulty, quality, playerScore);
  const badges = buildBadges(input.difficulty, quality);

  await sql`
    INSERT INTO ai_battle_rewards
      (ai_battle_id, user_id, aura_awarded, xp_awarded, coins_awarded, achievements,
       badges, performance_rating, difficulty_multiplier, quality_score, reward_reduction_reason)
    VALUES
      (${input.battleId}, ${input.userId}, ${aura}, ${xp}, ${coins}, ${JSON.stringify(achievements)},
       ${JSON.stringify(badges)}, ${performanceRating}, ${config.multiplier}, ${quality},
       ${reasons.join(" ") || null})
    ON CONFLICT (ai_battle_id) DO UPDATE SET
      aura_awarded = EXCLUDED.aura_awarded,
      xp_awarded = EXCLUDED.xp_awarded,
      coins_awarded = EXCLUDED.coins_awarded,
      achievements = EXCLUDED.achievements,
      badges = EXCLUDED.badges,
      performance_rating = EXCLUDED.performance_rating,
      difficulty_multiplier = EXCLUDED.difficulty_multiplier,
      quality_score = EXCLUDED.quality_score,
      reward_reduction_reason = EXCLUDED.reward_reduction_reason
  `;

  await sql`
    INSERT INTO ai_battle_daily_usage (user_id, day, aura_awarded, battles_completed, low_quality_count)
    VALUES (${input.userId}, CURRENT_DATE, ${aura}, 1, ${quality < REDUCED_REWARD_QUALITY ? 1 : 0})
    ON CONFLICT (user_id, day) DO UPDATE SET
      aura_awarded = ai_battle_daily_usage.aura_awarded + EXCLUDED.aura_awarded,
      battles_completed = ai_battle_daily_usage.battles_completed + 1,
      low_quality_count = ai_battle_daily_usage.low_quality_count + EXCLUDED.low_quality_count,
      updated_at = now()
  `;

  await sql`
    UPDATE users
    SET aura = GREATEST(aura + ${aura}, 0),
        xp = xp + ${xp},
        coins = coins + ${coins},
        ai_win_streak = CASE WHEN ${input.winner} = 'player' THEN ai_win_streak + 1 ELSE 0 END,
        ai_best_win_streak = CASE WHEN ${input.winner} = 'player' THEN GREATEST(ai_best_win_streak, ai_win_streak + 1) ELSE ai_best_win_streak END,
        achievements = (
          SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
          FROM jsonb_array_elements(achievements || ${JSON.stringify(achievements)}::jsonb) AS items(value)
        )
    WHERE id = ${input.userId}
  `;

  if (aura !== 0) {
    await sql`
      INSERT INTO aura_transactions (user_id, amount, reason, battle_id)
      VALUES (${input.userId}, ${aura}, ${`Battle AI ${input.difficulty}`}, ${input.battleId})
    `;
  }

  return {
    auraAwarded: aura,
    xpAwarded: xp,
    coinsAwarded: coins,
    achievements,
    badges,
    performanceRating,
    difficultyMultiplier: config.multiplier,
    dailyAuraCap: DAILY_AI_AURA_CAP,
    capRemainingAfter: Math.max(0, capRemaining - aura),
    qualityScore: quality,
    rewardReductionReason: reasons.join(" ") || null,
  };
}

function composeAiReply(input: {
  playerName: string;
  opponent: AiOpponent;
  battle: AiBattleRow;
  messages: { sender_type: string; content: string; round: number }[];
  playerMessage: string;
  round: number;
}) {
  const config = DIFFICULTY_CONFIG[input.battle.difficulty];
  const previousAi = input.messages.filter((message) => message.sender_type === "ai").map((message) => message.content);
  const callback = previousAi.length && config.depth >= 2 ? `Last round already showed the pattern: ${clip(previousAi[previousAi.length - 1], 64)}. ` : "";
  const vocab = pick(input.opponent.vocabulary.length ? input.opponent.vocabulary : ["logic"]);
  const domain = pick(input.opponent.knowledge_domains.length ? input.opponent.knowledge_domains : ["debate"]);
  const playerPoint = clip(input.playerMessage, 90);
  const depthLine =
    config.depth >= 4
      ? "I am answering the premise, the hidden assumption, and the audience impact in one swing."
      : config.depth >= 3
      ? "Your point has energy, but the conclusion does not survive the counterexample."
      : config.depth >= 2
      ? "The claim sounds clean until the tradeoff walks in."
      : "Simple counter: the point needs proof.";
  const personalityLine = `${input.opponent.display_name} mode: ${input.opponent.humor_style}, ${domain}, ${vocab}.`;
  const raw = `${callback}${input.playerName}, "${playerPoint}" is a decent setup. ${depthLine} ${personalityLine}`;

  return {
    content: localizeAiReply(raw, input.battle.language_mode, input.round),
    metadata: {
      difficulty: input.battle.difficulty,
      speed: config.speed,
      depth: config.depth,
      opponent: input.opponent.slug,
      transparentAi: true,
    },
  };
}

function evaluatePlayerQuality(messages: string[]) {
  const normalized = messages.map(normalizeText).filter(Boolean);
  const unique = new Set(normalized).size;
  const totalWords = messages.join(" ").split(/\s+/).filter(Boolean).length;
  const repeated = normalized.length - unique;
  const averageLength = messages.reduce((sum, message) => sum + message.length, 0) / Math.max(1, messages.length);
  const copyPasteDetected = repeated >= 1 || normalized.some((message) => message.length > 30 && messages.filter((m) => normalizeText(m) === message).length > 1);
  const afkDetected = messages.some((message) => normalizeText(message).length <= 2) || totalWords < messages.length * 4;
  const spamDetected = messages.some((message) => /(.)\1{7,}|https?:\/\/|www\./i.test(message));
  const topicEffort = Math.min(30, totalWords * 1.4);
  const variety = Math.min(30, unique * 8);
  const lengthScore = Math.min(25, averageLength / 4);
  const penalty = (copyPasteDetected ? 25 : 0) + (afkDetected ? 24 : 0) + (spamDetected ? 35 : 0);
  const qualityScore = clamp(Math.round(20 + topicEffort + variety + lengthScore - penalty));
  return { qualityScore, copyPasteDetected, afkDetected, spamDetected, averageLength: Math.round(averageLength), totalWords };
}

function evaluateBattleQuality(allMessages: string[], judge: JudgeResult) {
  const playerMessages = allMessages.filter((_, index) => index % 2 === 0);
  const playerQuality = evaluatePlayerQuality(playerMessages);
  const playerScore = judge.scores.creator.total;
  const qualityScore = clamp(Math.round(playerQuality.qualityScore * 0.55 + playerScore * 0.45));
  return {
    ...playerQuality,
    qualityScore,
    intentionalLosingSuspected: playerScore < 28 || (playerQuality.afkDetected && playerScore < 45),
    learningPatterns: extractPatterns(allMessages),
  };
}

function extractPatterns(messages: string[]) {
  return messages
    .filter((message) => /(because|but|actually|counter|lol|bro|yaar|macha|nuvvu|seri|point)/i.test(message))
    .map((message) => clip(message.replace(/\s+/g, " "), 120))
    .slice(0, 8);
}

async function getOpponent(slug: string): Promise<AiOpponent | null> {
  const rows = await sql`
    SELECT slug, display_name, title, personality, vocabulary, humor_style, aggression,
           knowledge_domains, confidence, reasoning, creativity, memory, language_preference, avatar_url
    FROM ai_opponents
    WHERE slug = ${slug} AND is_active = TRUE
    LIMIT 1
  `;
  return rows[0] ? normalizeOpponent(rows[0]) : null;
}

function normalizeOpponent(row: any): AiOpponent {
  return {
    slug: String(row.slug),
    display_name: String(row.display_name),
    title: String(row.title),
    personality: String(row.personality),
    vocabulary: arrayFromJson(row.vocabulary),
    humor_style: String(row.humor_style),
    aggression: Number(row.aggression) || 50,
    knowledge_domains: arrayFromJson(row.knowledge_domains),
    confidence: Number(row.confidence) || 50,
    reasoning: Number(row.reasoning) || 50,
    creativity: Number(row.creativity) || 50,
    memory: Number(row.memory) || 50,
    language_preference: String(row.language_preference ?? "English"),
    avatar_url: String(row.avatar_url ?? ""),
  };
}

function buildAchievements(winner: "player" | "ai" | "draw", difficulty: BattleAiDifficulty, quality: number, score: number) {
  const achievements: string[] = [];
  if (winner === "player") achievements.push(`Defeated ${difficulty} AI`);
  if (quality >= 80) achievements.push("High Quality AI Battle");
  if (score >= 85) achievements.push("AI Battle Specialist");
  if (["Legend", "Mythic"].includes(difficulty) && winner === "player") achievements.push("Boss Slayer");
  return achievements;
}

function buildBadges(difficulty: BattleAiDifficulty, quality: number) {
  const badges = [`${difficulty} Challenger`];
  if (quality >= 75) badges.push("Clean Rounds");
  if (["Master", "Grandmaster", "Legend", "Mythic"].includes(difficulty)) badges.push("Elite AI Arena");
  return badges;
}

function localizeAiReply(text: string, language: BattleAiLanguage, round: number) {
  if (language === "Auto" || language === "English") return text;
  if (language === "Hindi") return `${round % 2 ? "Dekho, " : "Baat simple hai: "}${text}`;
  if (language === "Hinglish") return `${round % 2 ? "Arre yaar, " : "Bro honestly, "}${text}`;
  if (language === "Telugu") return `${round % 2 ? "Chudu, " : "Matter enti ante, "}${text}`;
  if (language === "Tamil") return `${round % 2 ? "Macha, " : "Seri, "}${text}`;
  if (language === "Kannada") return `${round % 2 ? "Nodu, " : "Simple aagi, "}${text}`;
  if (language === "Malayalam") return `${round % 2 ? "Nokku, " : "Point simple aanu, "}${text}`;
  if (language === "Marathi") return `${round % 2 ? "Bagh, " : "Mudda simple aahe, "}${text}`;
  if (language === "Punjabi") return `${round % 2 ? "Vekh yaar, " : "Gall simple aa, "}${text}`;
  if (language === "Urdu") return `${round % 2 ? "Dekhiye, " : "Baat seedhi hai, "}${text}`;
  return text;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function arrayFromJson(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
