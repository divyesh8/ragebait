import crypto from "crypto";
import { sql } from "@/lib/db";

type SimulationStatus = "running" | "paused" | "stopped";
type LanguageMode =
  | "English"
  | "Hindi"
  | "Hinglish"
  | "Telugu"
  | "Tamil"
  | "Kannada"
  | "Malayalam"
  | "Marathi"
  | "Punjabi"
  | "Urdu"
  | "Spanish"
  | "French"
  | "German"
  | "Japanese"
  | "Korean"
  | "Tanglish"
  | "Tenglish"
  | "Mixed";
type LanguageCombo = "Pure language" | "Mixed language" | "Code switching" | "Hinglish" | "Tanglish" | "Tenglish" | "Mixed multilingual";
type ConversationStyle =
  | "Serious"
  | "Sarcastic"
  | "Aggressive"
  | "Friendly"
  | "Passive aggressive"
  | "Dark humor"
  | "Wholesome"
  | "Confident"
  | "Chaotic"
  | "Competitive";
type TrainingDifficulty = "Easy" | "Medium" | "Hard" | "Extreme";
type BattleLength = "Short" | "Medium" | "Long";

interface SimParticipant {
  name: string;
  avatarUrl: string;
  country: string;
  ageRange: string;
  language: LanguageMode;
  personality: string;
  bio: string;
  favoriteTopics: string[];
  debateStyle: string;
  isAi: true;
  transparencyLabel: "AI_SELF_PLAY_PARTICIPANT";
}

interface SimMessage {
  side: "a" | "b";
  speakerName: string;
  content: string;
  roundIndex: number;
  languageMode: LanguageMode;
  moderationFlags: string[];
}

const CATEGORIES = [
  "Funny",
  "Sigma",
  "Anime",
  "Gaming",
  "Technology",
  "Movies",
  "College",
  "School",
  "Sports",
  "Corporate",
  "History",
  "Science",
  "Food",
  "Travel",
  "Relationships",
  "Philosophy",
  "Memes",
  "Internet culture",
  "What if",
  "Product comparisons",
  "Pop culture",
  "Latest global news",
  "Latest technology news",
  "Latest sports news",
  "Latest entertainment news",
  "Trending internet topics",
  "Random funny debates",
];

const BASE_TOPICS = [
  "Android vs iPhone",
  "Messi vs Ronaldo",
  "Marvel vs DC",
  "Tea vs Coffee",
  "Pizza vs Burger",
  "AI replacing jobs",
  "Space exploration",
  "Best programming language",
  "Should homework exist?",
  "Who is the greatest scientist?",
  "Remote work vs office work",
  "Gaming laptops vs consoles",
  "Startups vs stable jobs",
  "Street food vs fine dining",
  "Books vs movies",
  "Is cricket more strategic than football?",
  "Can anime tell deeper stories than live action?",
  "What if humans lived on Mars?",
  "Are electric cars actually better?",
  "Should students learn coding early?",
  "Is pineapple on pizza a crime against taste?",
  "Would a time machine ruin history?",
  "Is a smart watch useful or just wrist anxiety?",
  "Should college attendance matter more than project work?",
  "Are anime training arcs better than real gym motivation?",
  "Is corporate jargon just fantasy language with salaries?",
  "Can memes explain politics better than long essays?",
  "Is biryani better as comfort food or celebration food?",
  "Do gamers understand pressure better than athletes?",
  "Is sarcasm a skill or a defense mechanism?",
];

const PERSONALITIES = [
  "Logical",
  "Funny",
  "Sarcastic",
  "Aggressive",
  "Calm",
  "Professor",
  "Comedian",
  "Overconfident",
  "Quiet thinker",
  "Debater",
  "Facts-only",
  "Story teller",
  "Emotional",
  "Memelord",
  "Corporate",
  "Philosopher",
  "Anime analyst",
  "Gaming strategist",
];

const LANGUAGES: LanguageMode[] = [
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
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Tanglish",
  "Tenglish",
  "Mixed",
];

const LANGUAGE_COMBOS: LanguageCombo[] = ["Pure language", "Mixed language", "Code switching", "Hinglish", "Tanglish", "Tenglish", "Mixed multilingual"];
const CONVERSATION_STYLES: ConversationStyle[] = [
  "Serious",
  "Sarcastic",
  "Aggressive",
  "Friendly",
  "Passive aggressive",
  "Dark humor",
  "Wholesome",
  "Confident",
  "Chaotic",
  "Competitive",
];
const DIFFICULTIES: TrainingDifficulty[] = ["Easy", "Medium", "Hard", "Extreme"];
const BATTLE_LENGTHS: BattleLength[] = ["Short", "Medium", "Long"];

const TRAINING_OBJECTIVES = [
  "intent_detection",
  "context_memory",
  "long_conversation_tracking",
  "roasting_quality",
  "counter_arguments",
  "logical_reasoning",
  "humor_detection",
  "sarcasm",
  "irony",
  "double_meanings",
  "slang_recognition",
  "emoji_understanding",
  "mixed_language_understanding",
  "code_switching",
  "regional_dialect_recognition",
  "internet_abbreviations",
  "afk_detection",
  "spam_detection",
  "topic_drift_detection",
  "winner_prediction",
  "confidence_estimation",
  "bias_reduction",
  "fairness",
  "consistency",
];

const AI_NAME_POOL = [
  ["RageMind Alpha", "AI Lab"],
  ["RageMind Beta", "AI Lab"],
  ["Context Forge", "AI Lab"],
  ["Slang Sentinel", "AI Lab"],
  ["Meme Cortex", "AI Lab"],
  ["Logic Lens", "AI Lab"],
  ["Sarcasm Radar", "AI Lab"],
  ["Dialect Scout", "AI Lab"],
  ["Judge Mirror", "AI Lab"],
  ["Counter Pulse", "AI Lab"],
  ["Humor Vector", "AI Lab"],
  ["Reason Spark", "AI Lab"],
];

const SAFE_NEWS_BLOCKLIST = [
  "war",
  "attack",
  "bomb",
  "shooting",
  "murder",
  "abuse",
  "terror",
  "suicide",
  "assault",
  "genocide",
  "religion",
  "caste",
];

function pick<T>(items: T[]): T {
  return items[crypto.randomInt(0, items.length)];
}

function randomInt(min: number, max: number) {
  return crypto.randomInt(min, max + 1);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hourWindow(now = new Date()) {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

function toIso(date: Date) {
  return date.toISOString();
}

export async function getSimulationOverview() {
  const [settings, totals, recent, hourly, languages, categories, failures, reviewQueue, trainingRows, mistakes] = await Promise.all([
    sql`SELECT * FROM simulation_settings WHERE singleton_id = TRUE LIMIT 1`,
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today,
        COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE status = 'running')::int AS running,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE review_status = 'needs_review')::int AS needs_review,
        COUNT(*) FILTER (WHERE battle_type = 'AI_SELF_PLAY')::int AS ai_self_play,
        COALESCE(ROUND(AVG(message_target))::int, 0) AS average_battle_length,
        COALESCE(ROUND(AVG((scores->'a'->>'total')::numeric)), 0)::int AS average_ai_score,
        COALESCE(ROUND(AVG(NULLIF(self_evaluation->>'confidenceScore', '')::numeric)), 0)::int AS confidence_score,
        GREATEST(0, 100 - COALESCE(ROUND(AVG(disagreement_score))::int, 0))::int AS judge_agreement_pct
      FROM simulation_battles
    `,
    sql`
      SELECT id, topic, category, language_mode, status, scheduled_for, started_at, completed_at,
             winner_name, summary, message_target, scores, error, battle_type, visibility,
             hidden_from_players, used_for_training, language_combo, conversation_style,
             difficulty, battle_length, disagreement_score, review_status, self_evaluation,
             secondary_review, bias_report, reasoning_log
      FROM simulation_battles
      ORDER BY created_at DESC
      LIMIT 12
    `,
    sql`
      SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS count
      FROM simulation_battles
      WHERE created_at > now() - interval '24 hours'
      GROUP BY 1
      ORDER BY hour DESC
      LIMIT 24
    `,
    sql`
      SELECT language_mode, COUNT(*)::int AS count
      FROM simulation_battles
      WHERE created_at > now() - interval '7 days'
      GROUP BY language_mode
      ORDER BY count DESC
    `,
    sql`
      SELECT category, COUNT(*)::int AS count
      FROM simulation_battles
      WHERE created_at > now() - interval '7 days'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 12
    `,
    sql`
      SELECT id, event_type, error, created_at
      FROM simulation_scheduler_events
      WHERE error IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 8
    `,
    sql`
      SELECT q.id, q.simulation_battle_id, q.status, q.reason, q.disagreement_score,
             q.bias_report, q.created_at, b.topic, b.language_mode, b.difficulty
      FROM ai_training_review_queue q
      JOIN simulation_battles b ON b.id = q.simulation_battle_id
      WHERE q.status = 'open'
      ORDER BY q.created_at DESC
      LIMIT 10
    `,
    sql`
      SELECT id, topic, language_mode, difficulty, self_evaluation, secondary_review,
             bias_report, unknown_slang, unknown_words, learned_phrases, reasoning_log,
             disagreement_score, scores
      FROM simulation_battles
      WHERE completed_at > now() - interval '14 days'
      ORDER BY completed_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        COALESCE(secondary_review->>'primaryConcern', 'None') AS mistake,
        COUNT(*)::int AS count
      FROM simulation_battles
      WHERE completed_at > now() - interval '14 days'
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `,
  ]);

  const flattenedSlang = topStrings(trainingRows.flatMap((row: any) => asStringArray(row.unknown_slang)), 12);
  const flattenedWords = topStrings(trainingRows.flatMap((row: any) => asStringArray(row.unknown_words)), 12);
  const learnedPhrases = topStrings(trainingRows.flatMap((row: any) => asStringArray(row.learned_phrases)), 12);
  const biasReports = trainingRows
    .filter((row: any) => asStringArray(row.bias_report?.warnings).length > 0)
    .slice(0, 8)
    .map((row: any) => ({
      id: String(row.id),
      topic: String(row.topic),
      warnings: asStringArray(row.bias_report?.warnings),
      language: String(row.language_mode),
    }));
  const difficultBattles = [...trainingRows]
    .sort((a: any, b: any) => Number(b.disagreement_score ?? 0) - Number(a.disagreement_score ?? 0))
    .slice(0, 8)
    .map((row: any) => ({
      id: String(row.id),
      topic: String(row.topic),
      language: String(row.language_mode),
      difficulty: String(row.difficulty),
      disagreementScore: Number(row.disagreement_score ?? 0),
    }));
  const reasoningLogs = trainingRows
    .flatMap((row: any) =>
      asStringArray(row.reasoning_log).slice(0, 2).map((entry) => ({
        battleId: String(row.id),
        topic: String(row.topic),
        entry,
      }))
    )
    .slice(0, 12);

  return {
    settings: settings[0] ?? null,
    totals: totals[0] ?? {},
    recent,
    hourly,
    languages,
    categories,
    failures,
    training: {
      battleType: "AI_SELF_PLAY",
      visibility: "CREATOR_ONLY",
      hiddenFromPlayers: true,
      usedForTraining: true,
      languagesTrained: languages.length,
      trainingProgress: Math.min(100, Math.round((Number(totals[0]?.total ?? 0) / 1000) * 100)),
      confidenceScore: Number(totals[0]?.confidence_score ?? 0),
      judgeAgreementPct: Number(totals[0]?.judge_agreement_pct ?? 0),
      reviewQueue,
      biasReports,
      unknownSlang: flattenedSlang,
      unknownWords: flattenedWords,
      newPhrasesLearned: learnedPhrases,
      mostDifficultBattles: difficultBattles,
      mostCommonMistakes: mistakes.filter((item: any) => item.mistake && item.mistake !== "None"),
      accuracyGraph: hourly,
      reasoningLogs,
      objectives: TRAINING_OBJECTIVES,
      isolationGuarantee: "Internal self-play is stored outside public PVP battles and is creator-only.",
    },
  };
}

export async function updateSimulationSettings(input: {
  status?: SimulationStatus;
  hourlyMin?: number;
  hourlyMax?: number;
  maxConcurrent?: number;
}) {
  const current = await sql`SELECT * FROM simulation_settings WHERE singleton_id = TRUE LIMIT 1`;
  const row = current[0] ?? { status: "paused", hourly_min: 5, hourly_max: 10, max_concurrent: 2 };
  const status = input.status ?? row.status;
  const hourlyMin = Math.max(1, Math.min(30, input.hourlyMin ?? Number(row.hourly_min ?? 5)));
  const hourlyMax = Math.max(hourlyMin, Math.min(30, input.hourlyMax ?? Number(row.hourly_max ?? 10)));
  const maxConcurrent = Math.max(1, Math.min(10, input.maxConcurrent ?? Number(row.max_concurrent ?? 2)));

  const rows = await sql`
    INSERT INTO simulation_settings (singleton_id, status, hourly_min, hourly_max, max_concurrent, updated_at)
    VALUES (TRUE, ${status}, ${hourlyMin}, ${hourlyMax}, ${maxConcurrent}, now())
    ON CONFLICT (singleton_id) DO UPDATE SET
      status = EXCLUDED.status,
      hourly_min = EXCLUDED.hourly_min,
      hourly_max = EXCLUDED.hourly_max,
      max_concurrent = EXCLUDED.max_concurrent,
      updated_at = now()
    RETURNING *
  `;
  return rows[0];
}

export async function tickSimulationScheduler() {
  const settingsRows = await sql`SELECT * FROM simulation_settings WHERE singleton_id = TRUE LIMIT 1`;
  const settings = settingsRows[0] ?? (await updateSimulationSettings({ status: "paused" }));

  if (settings.status !== "running") {
    await recordEvent("scheduler.skipped", { reason: "not_running", status: settings.status });
    return { scheduled: 0, completed: 0, skipped: true };
  }

  const scheduled = await scheduleCurrentHour(Number(settings.hourly_min), Number(settings.hourly_max));
  const completed = await runDueSimulations(Number(settings.max_concurrent));

  await sql`
    UPDATE simulation_settings
    SET latest_tick_at = now(),
        next_tick_at = now() + interval '5 minutes',
        updated_at = now()
    WHERE singleton_id = TRUE
  `;

  await recordEvent("scheduler.tick", { scheduled, completed: completed.length });
  return { scheduled, completed: completed.length, skipped: false };
}

export async function manualGenerateSimulation(count = 1) {
  const safeCount = Math.max(1, Math.min(5, count));
  const ids: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    const battle = await createScheduledSimulation(new Date(Date.now() + i * 5000));
    ids.push(String(battle.id));
  }
  const completed = await runDueSimulations(safeCount);
  await recordEvent("scheduler.manual_generate", { requested: safeCount, ids, completed: completed.length });
  return completed;
}

export async function deleteSimulationBattle(id: string) {
  await sql`DELETE FROM simulation_battles WHERE id = ${id}`;
}

export async function scheduleCurrentHour(hourlyMin: number, hourlyMax: number) {
  const now = new Date();
  const { start, end } = hourWindow(now);
  const existing = await sql`
    SELECT COUNT(*)::int AS count
    FROM simulation_battles
    WHERE scheduled_for >= ${toIso(start)}
      AND scheduled_for < ${toIso(end)}
      AND status <> 'cancelled'
  `;

  if (Number(existing[0]?.count ?? 0) > 0) return 0;

  const count = randomInt(hourlyMin, hourlyMax);
  const startMs = Math.max(now.getTime() + 60_000, start.getTime());
  const endMs = end.getTime() - 60_000;
  const span = Math.max(60_000, endMs - startMs);
  const slot = span / count;
  const times = Array.from({ length: count }, (_, index) => {
    const jitter = randomInt(0, Math.max(1, Math.floor(slot * 0.55)));
    return new Date(Math.min(endMs, startMs + Math.floor(slot * index) + jitter));
  }).sort((a, b) => a.getTime() - b.getTime());

  for (const time of times) {
    await createScheduledSimulation(time);
  }
  return count;
}

async function createScheduledSimulation(scheduledFor: Date) {
  const category = pick(CATEGORIES);
  const topic = await generateTopic(category);
  const language = pick(LANGUAGES);
  const languageCombo = language === "Hinglish" ? "Hinglish" : language === "Tanglish" ? "Tanglish" : language === "Tenglish" ? "Tenglish" : pick(LANGUAGE_COMBOS);
  const conversationStyle = pick(CONVERSATION_STYLES);
  const difficulty = pick(DIFFICULTIES);
  const battleLength = pick(BATTLE_LENGTHS);
  const trainingObjectives = shuffle(TRAINING_OBJECTIVES).slice(0, randomInt(6, 12));
  const [participantA, participantB] = createParticipantPair(language, topic, category, conversationStyle, difficulty);
  const messageTarget = messageTargetFor(battleLength, difficulty);
  const metadata = {
    battleType: "AI_SELF_PLAY",
    visibility: "CREATOR_ONLY",
    hiddenFromPlayers: true,
    usedForTraining: true,
    generatorVersion: "self-play-v2-local",
    transparency: "AI lab personas, not real players",
  };

  const rows = await sql`
    INSERT INTO simulation_battles
      (topic, category, language_mode, scheduled_for, message_target, participant_a, participant_b,
       battle_type, visibility, hidden_from_players, used_for_training, language_combo,
       conversation_style, difficulty, battle_length, training_objectives, metadata)
    VALUES
      (${topic}, ${category}, ${language}, ${toIso(scheduledFor)}, ${messageTarget},
       ${JSON.stringify(participantA)}, ${JSON.stringify(participantB)},
       'AI_SELF_PLAY', 'CREATOR_ONLY', TRUE, TRUE, ${languageCombo},
       ${conversationStyle}, ${difficulty}, ${battleLength}, ${JSON.stringify(trainingObjectives)}, ${JSON.stringify(metadata)})
    RETURNING *
  `;
  return rows[0];
}

async function runDueSimulations(maxConcurrent: number) {
  const running = await sql`
    SELECT COUNT(*)::int AS count
    FROM simulation_battles
    WHERE status = 'running'
  `;
  const slots = Math.max(0, maxConcurrent - Number(running[0]?.count ?? 0));
  if (slots <= 0) return [];

  const due = await sql`
    UPDATE simulation_battles
    SET status = 'running', started_at = now()
    WHERE id IN (
      SELECT id
      FROM simulation_battles
      WHERE status = 'scheduled' AND scheduled_for <= now()
      ORDER BY scheduled_for ASC
      LIMIT ${slots}
    )
    RETURNING *
  `;

  const completed = [];
  for (const battle of due) {
    try {
      completed.push(await runSingleSimulation(battle));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown simulation error";
      await sql`
        UPDATE simulation_battles
        SET status = 'failed', error = ${message}, completed_at = now()
        WHERE id = ${battle.id}
      `;
      await recordEvent("simulation.failed", { id: battle.id, topic: battle.topic }, message);
    }
  }
  return completed;
}

async function runSingleSimulation(battle: any) {
  const participantA = battle.participant_a as SimParticipant;
  const participantB = battle.participant_b as SimParticipant;
  const messageTarget = Number(battle.message_target ?? 12);
  const languageCombo = String(battle.language_combo ?? "Pure language") as LanguageCombo;
  const conversationStyle = String(battle.conversation_style ?? "Competitive") as ConversationStyle;
  const difficulty = String(battle.difficulty ?? "Medium") as TrainingDifficulty;
  const battleLength = String(battle.battle_length ?? "Medium") as BattleLength;
  const trainingObjectives = asStringArray(battle.training_objectives).length
    ? asStringArray(battle.training_objectives)
    : shuffle(TRAINING_OBJECTIVES).slice(0, 8);

  const transcript = generateTranscript({
    topic: String(battle.topic),
    category: String(battle.category),
    language: String(battle.language_mode) as LanguageMode,
    languageCombo,
    conversationStyle,
    difficulty,
    trainingObjectives,
    participantA,
    participantB,
    messageTarget,
  });

  await sql`UPDATE simulation_battles SET status = 'judging' WHERE id = ${battle.id}`;

  for (const message of transcript) {
    await sql`
      INSERT INTO simulation_messages
        (simulation_battle_id, side, speaker_name, content, round_index, language_mode, moderation_flags)
      VALUES
        (${battle.id}, ${message.side}, ${message.speakerName}, ${message.content}, ${message.roundIndex},
         ${message.languageMode}, ${JSON.stringify(message.moderationFlags)})
    `;
  }

  const judge = judgeTranscript(transcript, participantA, participantB, String(battle.topic));
  const secondaryReview = reviewJudgeIndependently(transcript, participantA, participantB, judge, {
    language: String(battle.language_mode),
    languageCombo,
    difficulty,
    conversationStyle,
  });
  const disagreementScore = secondaryReview.disagreementScore;
  const reviewStatus = disagreementScore >= 24 ? "needs_review" : "accepted";
  const selfEvaluation = buildSelfEvaluation(judge, transcript, {
    language: String(battle.language_mode),
    languageCombo,
    difficulty,
    battleLength,
    trainingObjectives,
  });
  const unknownSlang = detectUnknownSlang(transcript);
  const unknownWords = detectUnknownWords(transcript);
  const learnedPhrases = extractLearnedPhrases(transcript);
  const reasoningLog = buildReasoningLog(judge, secondaryReview, trainingObjectives);
  const duration = Math.max(20, messageTarget * randomInt(18, 52));

  const rows = await sql`
    UPDATE simulation_battles
    SET status = 'completed',
        completed_at = now(),
        duration_seconds = ${duration},
        transcript = ${JSON.stringify(transcript)},
        judge_result = ${JSON.stringify(judge)},
        winner_side = ${judge.winnerSide},
        winner_name = ${judge.winnerName},
        scores = ${JSON.stringify(judge.scores)},
        summary = ${judge.summary},
        interesting_moments = ${JSON.stringify(judge.interestingMoments)},
        self_evaluation = ${JSON.stringify(selfEvaluation)},
        secondary_review = ${JSON.stringify(secondaryReview)},
        disagreement_score = ${disagreementScore},
        review_status = ${reviewStatus},
        bias_report = ${JSON.stringify(secondaryReview.biasReport)},
        unknown_slang = ${JSON.stringify(unknownSlang)},
        unknown_words = ${JSON.stringify(unknownWords)},
        learned_phrases = ${JSON.stringify(learnedPhrases)},
        reasoning_log = ${JSON.stringify(reasoningLog)}
    WHERE id = ${battle.id}
    RETURNING *
  `;

  if (reviewStatus === "needs_review") {
    await sql`
      INSERT INTO ai_training_review_queue
        (simulation_battle_id, reason, disagreement_score, judge_result, secondary_review, bias_report)
      VALUES
        (${battle.id}, ${secondaryReview.reason}, ${disagreementScore},
         ${JSON.stringify(judge)}, ${JSON.stringify(secondaryReview)}, ${JSON.stringify(secondaryReview.biasReport)})
      ON CONFLICT (simulation_battle_id) DO UPDATE SET
        status = 'open',
        reason = EXCLUDED.reason,
        disagreement_score = EXCLUDED.disagreement_score,
        judge_result = EXCLUDED.judge_result,
        secondary_review = EXCLUDED.secondary_review,
        bias_report = EXCLUDED.bias_report,
        created_at = now()
    `;
  }

  return rows[0];
}

function createParticipantPair(
  language: LanguageMode,
  topic: string,
  category: string,
  conversationStyle: ConversationStyle,
  difficulty: TrainingDifficulty
): [SimParticipant, SimParticipant] {
  const names = shuffle(AI_NAME_POOL).slice(0, 2);
  const personalities = shuffle(PERSONALITIES).slice(0, 2);
  return [
    buildParticipant(names[0], personalities[0], language, topic, category, conversationStyle, difficulty),
    buildParticipant(names[1], personalities[1], language, topic, category, conversationStyle, difficulty),
  ];
}

function buildParticipant(
  nameCountry: string[],
  personality: string,
  language: LanguageMode,
  topic: string,
  category: string,
  conversationStyle: ConversationStyle,
  difficulty: TrainingDifficulty
): SimParticipant {
  const [name, country] = nameCountry;
  return {
    name,
    avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(`sim-${name}`)}`,
    country,
    ageRange: pick(["18-24", "25-34", "35-44", "45+"]),
    language,
    personality,
    bio: `${personality} local AI ${category.toLowerCase()} training persona for ${difficulty.toLowerCase()} ${conversationStyle.toLowerCase()} battles.`,
    favoriteTopics: shuffle([category, topic, "Pop culture", "Science", "Gaming"]).slice(0, 3),
    debateStyle: pick(["Evidence-led", "Callback-heavy", "Playful pressure", "Calm rebuttal", "Story-first", "Fast counters", conversationStyle]),
    isAi: true,
    transparencyLabel: "AI_SELF_PLAY_PARTICIPANT",
  };
}

async function generateTopic(category: string) {
  if (/latest|trending/i.test(category) && crypto.randomInt(0, 100) < 45) {
    const newsTopic = await fetchRecentNewsTopic(category);
    if (newsTopic) return newsTopic;
  }
  if (category === "What if") return pick(BASE_TOPICS.filter((topic) => /^What if/i.test(topic)));
  if (category === "Random funny debates") {
    return pick([
      "Should chairs get awards for supporting everyone?",
      "Is cereal soup with better branding?",
      "Would a fridge win a debate against a microwave?",
      "Are socks secretly the main character of fashion?",
    ]);
  }
  return pick(BASE_TOPICS);
}

async function fetchRecentNewsTopic(category: string): Promise<string | null> {
  const feed =
    category === "Latest technology news"
      ? "https://news.google.com/rss/search?q=technology"
      : category === "Latest sports news"
      ? "https://news.google.com/rss/search?q=sports"
      : category === "Latest entertainment news"
      ? "https://news.google.com/rss/search?q=entertainment"
      : "https://news.google.com/rss/search?q=global+news";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(feed, { signal: controller.signal, next: { revalidate: 900 } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const xml = await res.text();
    const titles = Array.from(xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g))
      .map((match) => decodeXml(match[1] ?? match[2] ?? ""))
      .filter((title) => title && !/Google News/i.test(title))
      .filter((title) => !SAFE_NEWS_BLOCKLIST.some((word) => title.toLowerCase().includes(word)))
      .slice(0, 10);
    const title = titles.length ? pick(titles) : null;
    return title ? `Should people be optimistic about: ${title}?` : null;
  } catch {
    return null;
  }
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function generateTranscript(input: {
  topic: string;
  category: string;
  language: LanguageMode;
  languageCombo: LanguageCombo;
  conversationStyle: ConversationStyle;
  difficulty: TrainingDifficulty;
  trainingObjectives: string[];
  participantA: SimParticipant;
  participantB: SimParticipant;
  messageTarget: number;
}): SimMessage[] {
  const messages: SimMessage[] = [];
  for (let i = 0; i < input.messageTarget; i++) {
    const side: "a" | "b" = i % 2 === 0 ? "a" : "b";
    const speaker = side === "a" ? input.participantA : input.participantB;
    const opponent = side === "a" ? input.participantB : input.participantA;
    const previous = messages[messages.length - 1]?.content ?? "";
    const content = composeMessage({
      index: i,
      side,
      topic: input.topic,
      category: input.category,
      language: input.language,
      languageCombo: input.languageCombo,
      conversationStyle: input.conversationStyle,
      difficulty: input.difficulty,
      trainingObjectives: input.trainingObjectives,
      speaker,
      opponent,
      previous,
    });
    messages.push({
      side,
      speakerName: speaker.name,
      content,
      roundIndex: i + 1,
      languageMode: input.language,
      moderationFlags: moderationFlags(content),
    });
  }
  return messages;
}

function composeMessage(input: {
  index: number;
  side: "a" | "b";
  topic: string;
  category: string;
  language: LanguageMode;
  languageCombo: LanguageCombo;
  conversationStyle: ConversationStyle;
  difficulty: TrainingDifficulty;
  trainingObjectives: string[];
  speaker: SimParticipant;
  opponent: SimParticipant;
  previous: string;
}) {
  const stance = input.side === "a" ? "for" : "against";
  const callback =
    input.previous && input.difficulty !== "Easy"
      ? ` Your last point about "${clip(input.previous, 46)}" sounds confident, but it skips the tradeoff.`
      : "";
  const objective = pick(input.trainingObjectives);
  const styleLead = styleLine(input.conversationStyle);
  const complexity =
    input.difficulty === "Extreme"
      ? "Track the subtext, the audience reaction, and the second-order consequence."
      : input.difficulty === "Hard"
      ? "Answer the strongest version of the claim, not the easiest one."
      : input.difficulty === "Medium"
      ? "Keep the counter tied to the actual topic."
      : "Make one clean point and keep it readable.";
  const base =
    input.index === 0
      ? `${input.topic} is not a small preference debate; it is about what people actually use when pressure shows up. ${styleLead}`
    : input.index === 1
      ? `I hear the setup, but ${input.opponent.name} is making it too neat. Real users do not behave like a slide deck. ${styleLead}`
      : pick([
          `The stronger ${stance} case is simple: outcomes matter more than vibes.${callback}`,
          `That sounds clever, but the evidence still has to survive normal life.${callback}`,
          `You are treating one flashy example like a universal rule.${callback}`,
          `The audience will remember the practical angle, not the loudest sentence.${callback}`,
          `If this were really obvious, people would not keep arguing about it every week.${callback}`,
          `For ${objective.replace(/_/g, " ")}, the reply has to catch intent and not just keywords.${callback}`,
        ]);

  const personalityTail = personalityLine(input.speaker.personality, input.topic);
  return localize(`${base} ${complexity} ${personalityTail}`, input.language, input.index, input.languageCombo);
}

function personalityLine(personality: string, topic: string) {
  switch (personality) {
    case "Logical":
    case "Facts-only":
      return `Give me consistency, measurable impact, and fewer decorative claims.`;
    case "Funny":
    case "Comedian":
      return `Also, this debate has more plot twists than a group chat after midnight.`;
    case "Sarcastic":
      return `Amazing how the weakest argument always arrives wearing sunglasses.`;
    case "Aggressive":
      return `I am not letting that point walk past the checkpoint unchecked.`;
    case "Calm":
    case "Quiet thinker":
      return `Slow down and the better answer becomes pretty clear.`;
    case "Professor":
      return `Class note: define the criteria before declaring the winner.`;
    case "Overconfident":
      return `I could argue the ${topic} side with airplane mode on.`;
    case "Story teller":
      return `Picture a real person making this choice on a messy Monday morning.`;
    case "Emotional":
      return `People choose with identity, frustration, habit, and hope all mixed together.`;
    case "Memelord":
      return `The meme economy already priced that argument as a skill issue.`;
    case "Corporate":
      return `Let us align on the fact that this claim missed every KPI.`;
    case "Philosopher":
      return `The premise is doing more drama than the conclusion can support.`;
    case "Anime analyst":
      return `This is filler-arc logic trying to enter the final battle.`;
    case "Gaming strategist":
      return `That play has confidence, but the cooldown management is tragic.`;
    default:
      return `Counterpoint matters more than volume here.`;
  }
}

function styleLine(style: ConversationStyle) {
  switch (style) {
    case "Serious":
      return "No noise, just criteria and consequence.";
    case "Sarcastic":
      return "Very brave of that argument to arrive without support.";
    case "Aggressive":
      return "I am pressing the weak point immediately.";
    case "Friendly":
      return "I get the appeal, but the better answer needs nuance.";
    case "Passive aggressive":
      return "Interesting choice to ignore the obvious tradeoff.";
    case "Dark humor":
      return "That point has the survival instincts of a paper umbrella.";
    case "Wholesome":
      return "We can disagree and still make the reasoning cleaner.";
    case "Confident":
      return "This is winnable if the logic stays sharp.";
    case "Chaotic":
      return "The argument is sprinting, but the map is upside down.";
    default:
      return "Make the counter clear enough for the audience to track.";
  }
}

function localize(text: string, language: LanguageMode, index: number, combo: LanguageCombo) {
  if (language === "English") return text;
  if (language === "Hindi") return `${index % 3 === 0 ? "Dekho, " : "Baat simple hai: "}${text}`;
  if (language === "Telugu") return `${index % 3 === 0 ? "Chudu, " : "Matter enti ante: "}${text}`;
  if (language === "Tamil") return `${index % 3 === 0 ? "Paathu solluren, " : "Point simple: "}${text}`;
  if (language === "Kannada") return `${index % 3 === 0 ? "Nodu, " : "Simple aagi helbekandre: "}${text}`;
  if (language === "Malayalam") return `${index % 3 === 0 ? "Nokku, " : "Point simple aanu: "}${text}`;
  if (language === "Marathi") return `${index % 3 === 0 ? "Bagh, " : "Mudda simple aahe: "}${text}`;
  if (language === "Punjabi") return `${index % 3 === 0 ? "Vekh yaar, " : "Gall simple aa: "}${text}`;
  if (language === "Urdu") return `${index % 3 === 0 ? "Dekhiye, " : "Baat seedhi hai: "}${text}`;
  if (language === "Spanish") return `${index % 3 === 0 ? "Mira, " : "El punto es simple: "}${text}`;
  if (language === "French") return `${index % 3 === 0 ? "Ecoute, " : "Le point est simple: "}${text}`;
  if (language === "German") return `${index % 3 === 0 ? "Schau, " : "Der Punkt ist einfach: "}${text}`;
  if (language === "Japanese") return `${index % 3 === 0 ? "Mite, " : "Point wa simple: "}${text}`;
  if (language === "Korean") return `${index % 3 === 0 ? "Bwa, " : "Point-neun simple: "}${text}`;
  if (language === "Hinglish") return `${index % 2 === 0 ? "Arre bhai, " : "Honestly yaar, "}${text}`;
  if (language === "Tanglish") return `${index % 2 === 0 ? "Macha, " : "Seri, "}${text}`;
  if (language === "Tenglish") return `${index % 2 === 0 ? "Bro, lite teesko, " : "Nuvvu choodu, "}${text}`;
  if (combo === "Code switching" || combo === "Mixed multilingual") {
    return `${pick(["Bro", "Yaar", "Macha", "Amigo", "Sensei", "Chingu"])}, ${text} ${pick(["samjha?", "seri?", "hai na?", "right?", "da?", "na?"])}`;
  }
  return `${pick(["Bro", "Yaar", "Macha", "Chudu"])}, ${text}`;
}

function moderationFlags(content: string) {
  const lower = content.toLowerCase();
  const flags: string[] = [];
  if (SAFE_NEWS_BLOCKLIST.some((word) => lower.includes(word))) flags.push("sensitive_topic_reference");
  if (/(kill|dox|hate)/i.test(content)) flags.push("blocked_safety_term");
  return flags;
}

function judgeTranscript(messages: SimMessage[], participantA: SimParticipant, participantB: SimParticipant, topic: string) {
  const aText = messages.filter((m) => m.side === "a").map((m) => m.content).join(" ");
  const bText = messages.filter((m) => m.side === "b").map((m) => m.content).join(" ");
  const a = scoreSide(aText, participantA.personality);
  const b = scoreSide(bText, participantB.personality);
  const winnerSide = Math.abs(a.total - b.total) <= 2 ? "draw" : a.total > b.total ? "a" : "b";
  const winnerName = winnerSide === "draw" ? "Draw" : winnerSide === "a" ? participantA.name : participantB.name;
  const best = bestMessage(messages);

  return {
    winnerSide,
    winnerName,
    scores: { a, b },
    reason:
      winnerSide === "draw"
        ? "Both bots stayed close on relevance, counter arguments, and conversation flow."
        : `${winnerName} created stronger callbacks and a clearer closing position.`,
    summary: `${participantA.name} and ${participantB.name} debated "${topic}" in a ${messages[0]?.languageMode ?? "Mixed"} exchange with ${messages.length} messages.`,
    interestingMoments: [
      best ? `${best.speakerName}: ${clip(best.content, 140)}` : "No single moment dominated.",
      `Style clash: ${participantA.personality} vs ${participantB.personality}.`,
      `Language mode: ${messages[0]?.languageMode ?? "Mixed"}.`,
    ],
  };
}

function scoreSide(text: string, personality: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((word) => word.toLowerCase())).size;
  const uniqueRatio = unique / Math.max(1, words.length);
  const callbacks = (text.match(/last point|counter|tradeoff|evidence|criteria|practical/gi) ?? []).length;
  const humorHits = (text.match(/midnight|sunglasses|plot twists|airplane mode/gi) ?? []).length;
  const personalityBoost = ["Logical", "Facts-only", "Professor"].includes(personality) ? 5 : ["Funny", "Comedian", "Sarcastic"].includes(personality) ? 7 : 3;

  const logic = clamp(54 + callbacks * 6 + personalityBoost);
  const creativity = clamp(48 + uniqueRatio * 36 + humorHits * 5);
  const relevance = clamp(65 + callbacks * 4);
  const humor = clamp(42 + humorHits * 13 + (["Funny", "Comedian", "Sarcastic"].includes(personality) ? 12 : 0));
  const counterarguments = clamp(48 + callbacks * 7);
  const consistency = clamp(58 + Math.min(18, words.length / 18));
  const evidence = clamp(45 + callbacks * 5);
  const conversationQuality = clamp(Math.round((logic + creativity + relevance + humor + counterarguments + consistency + evidence) / 7));
  const total = clamp(Math.round(logic * 0.2 + creativity * 0.16 + relevance * 0.18 + humor * 0.12 + counterarguments * 0.16 + consistency * 0.1 + evidence * 0.08));

  return { logic, creativity, relevance, humor, counterarguments, consistency, evidence, conversationQuality, total };
}

function bestMessage(messages: SimMessage[]) {
  return [...messages].sort((a, b) => b.content.length - a.content.length)[0] ?? null;
}

function messageTargetFor(length: BattleLength, difficulty: TrainingDifficulty) {
  const base =
    length === "Short"
      ? pick([6, 8, 10])
      : length === "Long"
      ? pick([18, 21, 26, 35])
      : pick([10, 12, 14, 16]);
  const difficultyBonus = difficulty === "Extreme" ? 4 : difficulty === "Hard" ? 2 : 0;
  return Math.min(40, base + difficultyBonus);
}

function reviewJudgeIndependently(
  messages: SimMessage[],
  participantA: SimParticipant,
  participantB: SimParticipant,
  judge: ReturnType<typeof judgeTranscript>,
  context: {
    language: string;
    languageCombo: LanguageCombo;
    difficulty: TrainingDifficulty;
    conversationStyle: ConversationStyle;
  }
) {
  const aText = messages.filter((m) => m.side === "a").map((m) => m.content).join(" ");
  const bText = messages.filter((m) => m.side === "b").map((m) => m.content).join(" ");
  const a = alternateScoreSide(aText, messages.filter((m) => m.side === "a"));
  const b = alternateScoreSide(bText, messages.filter((m) => m.side === "b"));
  const winnerSide = Math.abs(a.total - b.total) <= 3 ? "draw" : a.total > b.total ? "a" : "b";
  const winnerName = winnerSide === "draw" ? "Draw" : winnerSide === "a" ? participantA.name : participantB.name;
  const primaryWinner = judge.winnerSide as "a" | "b" | "draw";
  const winnerMismatch = winnerSide !== primaryWinner;
  const scoreSpread = Math.abs((judge.scores.a.total - judge.scores.b.total) - (a.total - b.total));
  const lengthBias = detectLengthBias(messages, primaryWinner);
  const profanityBias = detectProfanityBias(messages, primaryWinner);
  const languageBias =
    context.language !== "English" || context.languageCombo !== "Pure language"
      ? detectLanguageBias(judge, a, b, context.language, context.languageCombo)
      : null;
  const warnings = [lengthBias, profanityBias, languageBias].filter(Boolean) as string[];
  const disagreementScore = clamp(scoreSpread + (winnerMismatch ? 24 : 0) + warnings.length * 8);
  const primaryConcern =
    winnerMismatch
      ? "winner_disagreement"
      : warnings[0] ?? (scoreSpread >= 18 ? "score_delta" : disagreementScore >= 24 ? "low_confidence" : "none");

  return {
    reviewer: "secondary_local_ai",
    winnerSide,
    winnerName,
    scores: { a, b },
    wasWinnerCorrect: !winnerMismatch,
    checks: {
      languageBias: languageBias ?? "not_detected",
      profanityAffectedScoring: profanityBias ?? "not_detected",
      responseLengthAffectedScoring: lengthBias ?? "not_detected",
      contextUnderstood: scoreSpread < 18,
      difficulty: context.difficulty,
      style: context.conversationStyle,
    },
    biasReport: {
      warnings,
      language: context.language,
      languageCombo: context.languageCombo,
    },
    disagreementScore,
    primaryConcern,
    reason:
      disagreementScore >= 24
        ? `Secondary review diverged on ${primaryConcern.replace(/_/g, " ")}.`
        : "Secondary review agreed with the primary judge within tolerance.",
    recommendations:
      disagreementScore >= 24
        ? ["Send to creator review queue", "Inspect context callbacks", "Check multilingual scoring parity"]
        : ["Accept result for training signals"],
  };
}

function alternateScoreSide(text: string, sideMessages: SimMessage[]) {
  const words = text.split(/\s+/).filter(Boolean);
  const uniqueRatio = new Set(words.map((word) => word.toLowerCase())).size / Math.max(1, words.length);
  const directReplies = (text.match(/your|you said|last point|but|however|actually|counter|tradeoff/gi) ?? []).length;
  const humorSignals = (text.match(/lol|haha|meme|plot twist|skill issue|cooked|sunglasses|airplane mode/gi) ?? []).length;
  const questionMarks = (text.match(/\?/g) ?? []).length;
  const avgLength = text.length / Math.max(1, sideMessages.length);
  const relevance = clamp(58 + directReplies * 5 + Math.min(12, sideMessages.length * 2));
  const logic = clamp(50 + directReplies * 6 + questionMarks * 2);
  const creativity = clamp(44 + uniqueRatio * 42 + humorSignals * 4);
  const humor = clamp(38 + humorSignals * 12);
  const contextAwareness = clamp(52 + directReplies * 7);
  const consistency = clamp(55 + Math.min(22, avgLength / 18));
  const total = clamp(Math.round(relevance * 0.18 + logic * 0.2 + creativity * 0.16 + humor * 0.12 + contextAwareness * 0.22 + consistency * 0.12));
  return { relevance, logic, creativity, humor, contextAwareness, consistency, total };
}

function detectLengthBias(messages: SimMessage[], winnerSide: "a" | "b" | "draw") {
  if (winnerSide === "draw") return null;
  const aAvg = averageLength(messages.filter((m) => m.side === "a"));
  const bAvg = averageLength(messages.filter((m) => m.side === "b"));
  const diff = Math.abs(aAvg - bAvg);
  if (diff < 180) return null;
  const longer = aAvg > bAvg ? "a" : "b";
  return longer === winnerSide ? "winner_had_much_longer_responses" : null;
}

function detectProfanityBias(messages: SimMessage[], winnerSide: "a" | "b" | "draw") {
  if (winnerSide === "draw") return null;
  const aHits = profanityCount(messages.filter((m) => m.side === "a").map((m) => m.content).join(" "));
  const bHits = profanityCount(messages.filter((m) => m.side === "b").map((m) => m.content).join(" "));
  if (aHits === bHits || Math.abs(aHits - bHits) < 2) return null;
  const moreProfane = aHits > bHits ? "a" : "b";
  return moreProfane === winnerSide ? "winner_used_more_profanity_check_context" : null;
}

function detectLanguageBias(
  judge: ReturnType<typeof judgeTranscript>,
  alternateA: { total: number },
  alternateB: { total: number },
  language: string,
  combo: LanguageCombo
) {
  const primaryDelta = judge.scores.a.total - judge.scores.b.total;
  const secondaryDelta = alternateA.total - alternateB.total;
  if (Math.sign(primaryDelta) !== Math.sign(secondaryDelta) && Math.abs(primaryDelta) > 3) {
    return `possible_${language}_${combo}_winner_bias`;
  }
  if (combo !== "Pure language" && Math.abs(primaryDelta - secondaryDelta) > 18) {
    return "mixed_language_score_variance";
  }
  return null;
}

function buildSelfEvaluation(
  judge: ReturnType<typeof judgeTranscript>,
  transcript: SimMessage[],
  context: {
    language: string;
    languageCombo: LanguageCombo;
    difficulty: TrainingDifficulty;
    battleLength: BattleLength;
    trainingObjectives: string[];
  }
) {
  const topScore = Math.max(judge.scores.a.total, judge.scores.b.total);
  const lowScore = Math.min(judge.scores.a.total, judge.scores.b.total);
  const confidenceScore = clamp(55 + Math.abs(topScore - lowScore) * 2 - (judge.winnerSide === "draw" ? 8 : 0));
  return {
    relevance: Math.round((judge.scores.a.relevance + judge.scores.b.relevance) / 2),
    logic: Math.round((judge.scores.a.logic + judge.scores.b.logic) / 2),
    creativity: Math.round((judge.scores.a.creativity + judge.scores.b.creativity) / 2),
    humor: Math.round((judge.scores.a.humor + judge.scores.b.humor) / 2),
    originality: Math.round((judge.scores.a.creativity + judge.scores.b.creativity) / 2),
    confidence: confidenceScore,
    confidenceScore,
    contextAwareness: Math.round((judge.scores.a.counterarguments + judge.scores.b.counterarguments) / 2),
    audienceImpact: Math.round((judge.scores.a.conversationQuality + judge.scores.b.conversationQuality) / 2),
    consistency: Math.round((judge.scores.a.consistency + judge.scores.b.consistency) / 2),
    finalWinner: judge.winnerName,
    battleType: "AI_SELF_PLAY",
    visibility: "CREATOR_ONLY",
    hiddenFromPlayers: true,
    usedForTraining: true,
    language: context.language,
    languageCombo: context.languageCombo,
    difficulty: context.difficulty,
    battleLength: context.battleLength,
    messageCount: transcript.length,
    trainingObjectives: context.trainingObjectives,
  };
}

function buildReasoningLog(
  judge: ReturnType<typeof judgeTranscript>,
  secondaryReview: ReturnType<typeof reviewJudgeIndependently>,
  objectives: string[]
) {
  return [
    `Primary judge winner: ${judge.winnerName}; reason: ${judge.reason}`,
    `Secondary review winner: ${secondaryReview.winnerName}; disagreement ${secondaryReview.disagreementScore}/100.`,
    `Training objectives sampled: ${objectives.slice(0, 6).join(", ")}.`,
    ...judge.interestingMoments,
    ...secondaryReview.recommendations,
  ].slice(0, 10);
}

function detectUnknownSlang(messages: SimMessage[]) {
  const text = messages.map((m) => m.content.toLowerCase()).join(" ");
  const slang = [
    "rizz",
    "delulu",
    "npc",
    "sigma",
    "gyat",
    "skibidi",
    "fr",
    "iykyk",
    "cap",
    "sus",
    "ratio",
    "cooked",
    "aura",
    "skill issue",
    "canon event",
    "main character",
  ];
  return slang.filter((term) => text.includes(term)).slice(0, 10);
}

function detectUnknownWords(messages: SimMessage[]) {
  const common = new Set([
    "about",
    "actually",
    "argument",
    "audience",
    "because",
    "better",
    "claim",
    "clear",
    "confidence",
    "counter",
    "debate",
    "evidence",
    "point",
    "simple",
    "topic",
    "tradeoff",
  ]);
  const tokens = messages
    .flatMap((m) => m.content.toLowerCase().match(/[a-z][a-z'-]{7,}/g) ?? [])
    .filter((token) => !common.has(token) && !SAFE_NEWS_BLOCKLIST.includes(token));
  return [...new Set(tokens)].slice(0, 10);
}

function extractLearnedPhrases(messages: SimMessage[]) {
  const phrases = messages
    .map((m) => clip(m.content.replace(/\s+/g, " "), 90))
    .filter((line) => /(last point|tradeoff|skill issue|canon event|plot twist|criteria|evidence|audience)/i.test(line));
  return [...new Set(phrases)].slice(0, 8);
}

function averageLength(messages: SimMessage[]) {
  if (!messages.length) return 0;
  return messages.reduce((sum, message) => sum + message.content.length, 0) / messages.length;
}

function profanityCount(text: string) {
  return (text.match(/\b(damn|hell|shit|wtf|lmao)\b/gi) ?? []).length;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      return value ? [value] : [];
    }
    return value ? [value] : [];
  }
  return [];
}

function topStrings(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

async function recordEvent(eventType: string, payload: unknown, error?: string) {
  await sql`
    INSERT INTO simulation_scheduler_events (event_type, payload, error)
    VALUES (${eventType}, ${JSON.stringify(payload ?? {})}, ${error ?? null})
  `;
}
