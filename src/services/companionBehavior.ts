export const emotionKeys = [
  "happiness",
  "confidence",
  "excitement",
  "curiosity",
  "respect",
  "energy",
  "pride",
  "disappointment",
  "shock",
  "anger",
  "confusion",
  "sleepiness",
  "trust",
  "loyalty",
] as const;

export type EmotionKey = (typeof emotionKeys)[number];
export type EmotionState = Record<EmotionKey, number>;

export type CompanionState =
  | "idle"
  | "watching"
  | "thinking"
  | "excited"
  | "celebrating"
  | "laughing"
  | "surprised"
  | "sad"
  | "angry"
  | "motivating"
  | "sleeping"
  | "greeting"
  | "waving"
  | "pointing"
  | "clapping"
  | "facepalm"
  | "confused"
  | "typing"
  | "analyzing";

export type CompanionEventType =
  | "first_login"
  | "battle_waiting"
  | "battle_started"
  | "opponent_joined"
  | "player_message"
  | "opponent_message"
  | "user_typing"
  | "countdown_warning"
  | "judging_ready"
  | "battle_won"
  | "battle_lost"
  | "battle_completed"
  | "aura_record"
  | "win_streak"
  | "losing_streak"
  | "new_achievement"
  | "long_inactivity"
  | "mouse_hover"
  | "notification"
  | "idle_tick";

export type CompanionPersonalityId = "ember" | "fuse" | "anchor" | "vector";

export interface CompanionPersonality {
  id: CompanionPersonalityId;
  name: string;
  role: string;
  accent: string;
  traits: {
    aggressive: number;
    funny: number;
    confident: number;
    loyal: number;
    competitive: number;
    sarcastic: number;
    supportive: number;
    energetic: number;
    curious: number;
  };
}

export interface CompanionUserSnapshot {
  id: string;
  username: string;
  aura: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface CompanionBattleSnapshot {
  id: string;
  title: string;
  topic: string;
  battleType: string;
  mode: string;
  status: string;
  rounds: number;
  winnerId: string | null;
  creatorId: string;
  creatorUsername: string;
  opponentId: string | null;
  opponentUsername: string | null;
  expiresAt: string | null;
}

export interface CompanionMessageSnapshot {
  id: string;
  content: string;
  round: number;
  createdAt: string;
  userId: string;
  username: string;
}

export interface CompanionMemory {
  highestAura: number;
  currentStreak: number;
  longestWinStreak: number;
  favoriteBattleType: string | null;
  favoriteOpponent: string | null;
  lastDefeat: string | null;
  lastVictory: string | null;
  dailyLoginStreak: number;
  recentEmotions: EmotionKey[];
  playerRank: number | null;
  achievements: string[];
  hoursPlayed: number;
  battlesSeen: number;
  messagesSeen: number;
  lastBattleId: string | null;
  lastBattleStatus: string | null;
  lastMessageId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  battleTypeCounts: Record<string, number>;
  topicCounts: Record<string, number>;
}

export interface CompanionProfile {
  version: 1;
  emotions: EmotionState;
  memory: CompanionMemory;
  personalityId: CompanionPersonalityId;
  currentState: CompanionState;
}

export interface CompanionEventInput {
  battle: CompanionBattleSnapshot;
  messages: CompanionMessageSnapshot[];
  user: CompanionUserSnapshot | null;
  draft: string;
  isHovered: boolean;
  idleSeconds: number;
  now: number;
}

export interface CompanionEvent {
  type: CompanionEventType;
  at: number;
  battleId: string;
  label: string;
  intensity: number;
  messageId?: string;
  winnerId?: string | null;
  payload?: {
    latestMessage?: CompanionMessageSnapshot;
    messageFlavor?: MessageFlavor;
    countdownMs?: number;
    opponentName?: string | null;
    aura?: number;
    streak?: number;
  };
}

export interface CompanionDecision {
  event: CompanionEvent;
  state: CompanionState;
  label: string;
  line: string;
  face: string;
  animation: string;
  camera: string;
  effects: string[];
  sound: string;
  focus: "cursor" | "battle" | "notification" | "keyboard" | "self";
  intensity: number;
  shake: boolean;
  glow: "red" | "gold" | "cyan" | "white" | "dim";
  dominantEmotion: EmotionKey;
  moodScore: number;
}

type MessageFlavor =
  | "idle"
  | "nuclear"
  | "comeback"
  | "silence"
  | "brutal"
  | "weak"
  | "repeat"
  | "cringe"
  | "one_liner"
  | "wordplay"
  | "twist"
  | "self_roast"
  | "toxic"
  | "mic_drop"
  | "ko"
  | "legendary"
  | "funny"
  | "strategy";

interface BehaviorContext {
  event: CompanionEvent;
  profile: CompanionProfile;
  personality: CompanionPersonality;
}

interface BehaviorNode {
  name: string;
  when: (context: BehaviorContext) => boolean;
  respond: (context: BehaviorContext) => Omit<CompanionDecision, "event" | "dominantEmotion" | "moodScore">;
}

export const companionPersonalities: Record<CompanionPersonalityId, CompanionPersonality> = {
  ember: {
    id: "ember",
    name: "Ember",
    role: "Ragebait battle companion",
    accent: "from-red-500/35 via-orange-300/10 to-transparent",
    traits: {
      aggressive: 78,
      funny: 48,
      confident: 88,
      loyal: 76,
      competitive: 92,
      sarcastic: 42,
      supportive: 62,
      energetic: 86,
      curious: 45,
    },
  },
  fuse: {
    id: "fuse",
    name: "Fuse",
    role: "chaotic hype companion",
    accent: "from-fuchsia-400/25 via-red-400/15 to-transparent",
    traits: {
      aggressive: 58,
      funny: 88,
      confident: 72,
      loyal: 64,
      competitive: 74,
      sarcastic: 82,
      supportive: 55,
      energetic: 90,
      curious: 68,
    },
  },
  anchor: {
    id: "anchor",
    name: "Anchor",
    role: "loyal arena guide",
    accent: "from-white/20 via-red-400/10 to-transparent",
    traits: {
      aggressive: 34,
      funny: 45,
      confident: 74,
      loyal: 96,
      competitive: 68,
      sarcastic: 22,
      supportive: 92,
      energetic: 62,
      curious: 58,
    },
  },
  vector: {
    id: "vector",
    name: "Vector",
    role: "tactical battle analyst",
    accent: "from-cyan-300/25 via-white/10 to-transparent",
    traits: {
      aggressive: 44,
      funny: 36,
      confident: 82,
      loyal: 72,
      competitive: 88,
      sarcastic: 30,
      supportive: 66,
      energetic: 58,
      curious: 92,
    },
  },
};

const baselineEmotions: EmotionState = {
  happiness: 52,
  confidence: 58,
  excitement: 42,
  curiosity: 56,
  respect: 50,
  energy: 62,
  pride: 44,
  disappointment: 12,
  shock: 10,
  anger: 8,
  confusion: 10,
  sleepiness: 12,
  trust: 55,
  loyalty: 62,
};

const eventDeltas: Record<CompanionEventType, Partial<EmotionState>> = {
  first_login: { happiness: 20, excitement: 18, trust: 8, loyalty: 8, energy: 10 },
  battle_waiting: { curiosity: 12, energy: 6, sleepiness: -8 },
  battle_started: { excitement: 18, confidence: 8, energy: 14, curiosity: 6 },
  opponent_joined: { shock: 16, excitement: 16, energy: 12, curiosity: 10 },
  player_message: { excitement: 10, confidence: 8, pride: 8, curiosity: 4 },
  opponent_message: { curiosity: 12, shock: 7, excitement: 6 },
  user_typing: { curiosity: 12, energy: 4, sleepiness: -10 },
  countdown_warning: { shock: 12, excitement: 14, energy: 8, confusion: 4 },
  judging_ready: { curiosity: 18, confidence: 6, energy: 4 },
  battle_won: { happiness: 32, confidence: 24, excitement: 26, pride: 28, trust: 8, loyalty: 7, disappointment: -12 },
  battle_lost: { disappointment: 22, respect: 12, loyalty: 10, trust: 8, happiness: -12, confidence: -10 },
  battle_completed: { respect: 18, curiosity: 8, energy: -3 },
  aura_record: { happiness: 24, pride: 22, confidence: 20, excitement: 20 },
  win_streak: { pride: 18, confidence: 18, excitement: 14, energy: 10 },
  losing_streak: { disappointment: 12, loyalty: 15, trust: 12, confidence: -8 },
  new_achievement: { happiness: 26, pride: 20, excitement: 22, energy: 10 },
  long_inactivity: { sleepiness: 28, energy: -18, excitement: -12, curiosity: -8 },
  mouse_hover: { curiosity: 6, happiness: 4, sleepiness: -6 },
  notification: { curiosity: 14, shock: 8, energy: 7 },
  idle_tick: { sleepiness: 3, energy: -2, excitement: -2 },
};

const stateTransitions: Record<CompanionState, CompanionState[]> = {
  idle: ["watching", "thinking", "excited", "greeting", "waving", "sleeping", "typing"],
  watching: ["idle", "thinking", "excited", "surprised", "pointing", "typing", "analyzing", "sleeping"],
  thinking: ["watching", "analyzing", "confused", "excited", "idle", "facepalm"],
  excited: ["celebrating", "laughing", "watching", "clapping", "pointing", "surprised"],
  celebrating: ["clapping", "excited", "watching", "waving", "idle"],
  laughing: ["watching", "excited", "facepalm", "idle"],
  surprised: ["excited", "watching", "thinking", "confused", "clapping"],
  sad: ["motivating", "watching", "idle"],
  angry: ["motivating", "watching", "thinking"],
  motivating: ["watching", "excited", "idle", "waving"],
  sleeping: ["greeting", "waving", "watching", "idle"],
  greeting: ["waving", "watching", "idle"],
  waving: ["watching", "idle", "excited"],
  pointing: ["watching", "excited", "analyzing", "idle"],
  clapping: ["celebrating", "watching", "excited", "idle"],
  facepalm: ["motivating", "watching", "thinking", "idle"],
  confused: ["thinking", "watching", "motivating", "idle"],
  typing: ["watching", "thinking", "excited", "idle"],
  analyzing: ["thinking", "watching", "pointing", "celebrating", "idle"],
};

const baseLines: Record<CompanionEventType, string[]> = {
  first_login: ["You made it. Arena is awake.", "Good timing. The room is warming up."],
  battle_waiting: ["Open slot detected. Someone brave should show up soon.", "Holding the ring. Timer is moving."],
  battle_started: ["Battle is live. Keep the pressure clean and sharp.", "Opponent locked in. Time to cook."],
  opponent_joined: ["Opponent joined. Posture changed. Eyes up.", "There it is. The room just got louder."],
  player_message: ["That line landed. Keep climbing.", "Good angle. Push the advantage."],
  opponent_message: ["They answered. I am watching the counter.", "Opponent fired back. Plenty of room to turn it."],
  user_typing: ["I see the draft forming.", "Careful. The next line can swing the round."],
  countdown_warning: ["Clock is getting loud.", "Timer pressure is real. Move with intent."],
  judging_ready: ["Transcript locked. Verdict phase is next.", "The round is ready for review."],
  battle_won: ["That was brutal. Keep climbing.", "Win secured. Aura likes that one."],
  battle_lost: ["Forget that one. Next battle.", "Take the read, not the bruise. We go again."],
  battle_completed: ["Battle archived. I kept the useful parts.", "Match complete. Memory updated."],
  aura_record: ["New Aura peak. That gets fireworks.", "Highest Aura updated. That is a real climb."],
  win_streak: ["The streak has teeth now.", "Momentum is stacking. Stay dangerous."],
  losing_streak: ["Reset the angle. One clean battle changes the feeling.", "Bad stretch, not a bad player. Next one matters."],
  new_achievement: ["Achievement unlocked. That deserves noise.", "Badge moment. I am absolutely clapping."],
  long_inactivity: ["Powering down a little. Wake me when the arena moves.", "I will keep one eye open."],
  mouse_hover: ["Yep, I see you.", "Cursor spotted. I am following."],
  notification: ["Something lit up over there.", "Notification ping. Worth a glance."],
  idle_tick: ["Scanning the room.", "Small breath. Big patience."],
};

const personalityLines: Partial<Record<CompanionPersonalityId, Partial<Record<CompanionEventType, string[]>>>> = {
  ember: {
    battle_won: ["That was savage. Keep climbing.", "Winner energy. Do not soften it now."],
    battle_lost: ["Shake it off. Next battle gets sharper.", "Loss logged. Revenge file opened."],
    player_message: ["That had bite.", "Clean hit. Keep applying pressure."],
  },
  fuse: {
    player_message: ["That line had shoes on. It ran.", "Okay, that one came with sparks."],
    opponent_message: ["They replied. Cute. We can work with that.", "Counterfire detected. Drama restored."],
    battle_lost: ["Rough one. We delete the vibe, keep the lesson.", "That hurt, but it was not the final episode."],
  },
  anchor: {
    battle_lost: ["I am still with you. One cleaner angle and this flips.", "You are fine. Breathe, learn, queue the next one."],
    user_typing: ["Take the second it needs. Make it land.", "I am watching the keyboard. No rush, just aim."],
    long_inactivity: ["Rest mode. I will be right here.", "Quiet watch started. Come back when ready."],
  },
  vector: {
    judging_ready: ["Transcript complete. Pattern review is live.", "Data is ready. The verdict should be interesting."],
    opponent_message: ["Their structure is readable. Counter the premise.", "They exposed an angle. Use it."],
    countdown_warning: ["Low time. Prioritize the strongest premise.", "Timer compression. Send the cleanest version."],
  },
};

const messageFlavorMeta: Record<
  MessageFlavor,
  {
    label: string;
    state: CompanionState;
    face: string;
    animation: string;
    camera: string;
    effects: string[];
    sound: string;
    glow: CompanionDecision["glow"];
    shake: boolean;
    intensity: number;
  }
> = {
  idle: {
    label: "Reading the room",
    state: "watching",
    face: "focused",
    animation: "subtle head tilt, notes updating",
    camera: "desk read",
    effects: ["scan", "murmur"],
    sound: "low hum",
    glow: "cyan",
    shake: false,
    intensity: 0.4,
  },
  nuclear: {
    label: "Massive hit",
    state: "surprised",
    face: "wide-eyed",
    animation: "desk slam, recoil, rapid clap",
    camera: "hard close-up",
    effects: ["shockwave", "sparks", "crowd burst"],
    sound: "arena hit",
    glow: "red",
    shake: true,
    intensity: 1.35,
  },
  comeback: {
    label: "Comeback angle",
    state: "clapping",
    face: "laughing",
    animation: "points at the turn, applauds",
    camera: "winner zoom",
    effects: ["spotlight", "applause"],
    sound: "clap stack",
    glow: "gold",
    shake: false,
    intensity: 1.05,
  },
  silence: {
    label: "Quiet pressure",
    state: "watching",
    face: "raised brow",
    animation: "checks the timer, waits",
    camera: "reaction cam",
    effects: ["timer", "hush"],
    sound: "tick",
    glow: "dim",
    shake: false,
    intensity: 0.7,
  },
  brutal: {
    label: "Brutal line",
    state: "surprised",
    face: "hand over mouth",
    animation: "falls back laughing, returns to screen",
    camera: "slow push",
    effects: ["red flash", "laugh pulse"],
    sound: "record scratch",
    glow: "red",
    shake: true,
    intensity: 1.2,
  },
  weak: {
    label: "Needs bite",
    state: "facepalm",
    face: "deadpan",
    animation: "tiny sigh, leans back",
    camera: "wide deadpan",
    effects: ["low battery"],
    sound: "soft dip",
    glow: "dim",
    shake: false,
    intensity: 0.45,
  },
  repeat: {
    label: "Repeated angle",
    state: "facepalm",
    face: "eye roll",
    animation: "throws a note aside",
    camera: "side glance",
    effects: ["duplicate", "paper flick"],
    sound: "paper toss",
    glow: "white",
    shake: false,
    intensity: 0.55,
  },
  cringe: {
    label: "Awkward read",
    state: "facepalm",
    face: "covered",
    animation: "walks out of frame, returns slowly",
    camera: "empty-chair beat",
    effects: ["static", "warning edge"],
    sound: "glitch dip",
    glow: "dim",
    shake: false,
    intensity: 0.55,
  },
  one_liner: {
    label: "Clean one-liner",
    state: "clapping",
    face: "smirk",
    animation: "finger snap, small nod",
    camera: "snap zoom",
    effects: ["hit marker", "laser tick"],
    sound: "snap",
    glow: "white",
    shake: false,
    intensity: 0.9,
  },
  wordplay: {
    label: "Wordplay",
    state: "thinking",
    face: "thinking grin",
    animation: "slow clap, hologram notes",
    camera: "analysis close-up",
    effects: ["equations", "spark"],
    sound: "hologram bloom",
    glow: "cyan",
    shake: false,
    intensity: 0.95,
  },
  twist: {
    label: "Plot twist",
    state: "surprised",
    face: "glowing eyes",
    animation: "chair rotates, alert flash",
    camera: "orbit cam",
    effects: ["alarm sweep", "camera ring"],
    sound: "sirens",
    glow: "red",
    shake: true,
    intensity: 1.1,
  },
  self_roast: {
    label: "Self-roast",
    state: "laughing",
    face: "big smile",
    animation: "laughs, gives approval",
    camera: "friendly close-up",
    effects: ["approval", "green line"],
    sound: "level up",
    glow: "white",
    shake: false,
    intensity: 0.78,
  },
  toxic: {
    label: "Keep it competitive",
    state: "angry",
    face: "serious",
    animation: "warning frame, still posture",
    camera: "locked front",
    effects: ["warning", "audio duck"],
    sound: "warning ping",
    glow: "red",
    shake: false,
    intensity: 0.85,
  },
  mic_drop: {
    label: "Mic drop",
    state: "celebrating",
    face: "stone cold",
    animation: "throws a virtual mic, blast behind",
    camera: "dramatic zoom",
    effects: ["mic trail", "blast"],
    sound: "boom",
    glow: "red",
    shake: true,
    intensity: 1.3,
  },
  ko: {
    label: "Knockout",
    state: "celebrating",
    face: "shocked grin",
    animation: "bell ring, double clap",
    camera: "overhead snap",
    effects: ["KO", "bell flash"],
    sound: "final bell",
    glow: "gold",
    shake: true,
    intensity: 1.35,
  },
  legendary: {
    label: "High heat",
    state: "celebrating",
    face: "awe",
    animation: "stands and lifts both hands",
    camera: "arena sweep",
    effects: ["gold light", "crowd wave"],
    sound: "crowd swell",
    glow: "gold",
    shake: false,
    intensity: 1.18,
  },
  funny: {
    label: "Funny hit",
    state: "laughing",
    face: "laughing",
    animation: "laughs hard, chair spin",
    camera: "reaction cam",
    effects: ["laugh bars", "spin blur"],
    sound: "crowd laugh",
    glow: "white",
    shake: false,
    intensity: 0.82,
  },
  strategy: {
    label: "Strategic angle",
    state: "analyzing",
    face: "analytical",
    animation: "maps the argument, locks target",
    camera: "overhead desk",
    effects: ["strategy grid", "target lock"],
    sound: "data lock",
    glow: "cyan",
    shake: false,
    intensity: 0.9,
  },
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function overlap(a: string, b: string) {
  const aWords = new Set(normalizeText(a).split(/\s+/).filter((word) => word.length > 3));
  const bWords = normalizeText(b).split(/\s+/).filter((word) => word.length > 3);
  if (!aWords.size || !bWords.length) return 0;
  return bWords.filter((word) => aWords.has(word)).length / Math.max(bWords.length, 1);
}

function stableIndex(seed: string, count: number) {
  if (count <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}

function pickFavorite(counts: Record<string, number>) {
  const entries = Object.entries(counts).filter(([key]) => key.trim().length > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0];
}

function resolveState(current: CompanionState, target: CompanionState) {
  if (current === target) return target;
  const allowed = stateTransitions[current] ?? [];
  if (allowed.includes(target)) return target;
  if (target !== "sleeping" && allowed.includes("thinking")) return "thinking";
  return target;
}

export function createCompanionProfile(
  user: CompanionUserSnapshot | null,
  personalityId: CompanionPersonalityId = "ember",
  now = Date.now()
): CompanionProfile {
  const timestamp = new Date(now).toISOString();
  const aura = user?.aura ?? 0;
  return {
    version: 1,
    emotions: { ...baselineEmotions },
    personalityId,
    currentState: user ? "greeting" : "idle",
    memory: {
      highestAura: aura,
      currentStreak: user?.currentStreak ?? 0,
      longestWinStreak: user?.bestStreak ?? 0,
      favoriteBattleType: null,
      favoriteOpponent: null,
      lastDefeat: null,
      lastVictory: null,
      dailyLoginStreak: user ? 1 : 0,
      recentEmotions: [],
      playerRank: null,
      achievements: aura >= 1000 ? ["1000 Aura"] : [],
      hoursPlayed: 0,
      battlesSeen: 0,
      messagesSeen: 0,
      lastBattleId: null,
      lastBattleStatus: null,
      lastMessageId: null,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      battleTypeCounts: {},
      topicCounts: {},
    },
  };
}

export function normalizeCompanionProfile(
  value: unknown,
  user: CompanionUserSnapshot | null,
  personalityId: CompanionPersonalityId,
  now = Date.now()
) {
  const fallback = createCompanionProfile(user, personalityId, now);
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Partial<CompanionProfile>;
  const rawMemory = (raw.memory && typeof raw.memory === "object" ? raw.memory : {}) as Partial<CompanionMemory>;
  const rawEmotions = (raw.emotions && typeof raw.emotions === "object" ? raw.emotions : {}) as Partial<EmotionState>;
  const emotions = emotionKeys.reduce((next, key) => {
    next[key] = clamp(Number(rawEmotions[key]) || baselineEmotions[key]);
    return next;
  }, {} as EmotionState);

  const currentState = raw.currentState && stateTransitions[raw.currentState] ? raw.currentState : fallback.currentState;
  const storedPersonality = raw.personalityId && companionPersonalities[raw.personalityId] ? raw.personalityId : personalityId;
  const firstSeenAt = typeof rawMemory.firstSeenAt === "string" ? rawMemory.firstSeenAt : fallback.memory.firstSeenAt;
  const lastSeenAt = typeof rawMemory.lastSeenAt === "string" ? rawMemory.lastSeenAt : fallback.memory.lastSeenAt;
  const hoursPlayed = Math.max(0, Math.round(((now - new Date(firstSeenAt).getTime()) / 36_000) || 0) / 100);

  return {
    version: 1,
    personalityId: storedPersonality,
    currentState,
    emotions,
    memory: {
      ...fallback.memory,
      ...rawMemory,
      highestAura: Math.max(Number(rawMemory.highestAura) || 0, (user?.aura ?? 0)),
      currentStreak: user?.currentStreak ?? (Number(rawMemory.currentStreak) || 0),
      longestWinStreak: Math.max(user?.bestStreak ?? 0, Number(rawMemory.longestWinStreak) || 0),
      recentEmotions: Array.isArray(rawMemory.recentEmotions)
        ? rawMemory.recentEmotions.filter((key): key is EmotionKey => emotionKeys.includes(key as EmotionKey)).slice(-6)
        : [],
      achievements: Array.isArray(rawMemory.achievements) ? rawMemory.achievements.map(String).slice(-12) : [],
      battleTypeCounts: typeof rawMemory.battleTypeCounts === "object" && rawMemory.battleTypeCounts ? rawMemory.battleTypeCounts : {},
      topicCounts: typeof rawMemory.topicCounts === "object" && rawMemory.topicCounts ? rawMemory.topicCounts : {},
      firstSeenAt,
      lastSeenAt,
      hoursPlayed,
    },
  } satisfies CompanionProfile;
}

function inferCountdownMs(battle: CompanionBattleSnapshot, now: number) {
  if (!battle.expiresAt) return null;
  const expiresAt = new Date(battle.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return null;
  return Math.max(0, expiresAt - now);
}

function inferMessageFlavor(messages: CompanionMessageSnapshot[], latest: CompanionMessageSnapshot) {
  const text = normalizeText(latest.content);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const samePlayerPrevious = messages
    .slice(0, -1)
    .filter((message) => message.userId === latest.userId)
    .map((message) => message.content);
  const previousOpponent = [...messages].reverse().find((message) => message.userId !== latest.userId);
  const isRepeat = samePlayerPrevious.some((message) => overlap(message, latest.content) > 0.55);
  const comebackSignals = previousOpponent && hasAny(text, ["even", "still", "but", "actually", "you said", "your"]);

  if (hasAny(text, ["hate", "kill", "die", "slur", "caste", "religion", "race"])) return "toxic";
  if (isRepeat) return "repeat";
  if (hasAny(text, ["cringe", "unhear", "awkward"])) return "cringe";
  if (hasAny(text, ["checkmate", "game over", "mic drop", "match"])) return "mic_drop";
  if (hasAny(text, ["knockout", "ko ", "no reply", "ended"])) return "ko";
  if (hasAny(text, ["because", "strategy", "bait", "trap", "chess"])) return "strategy";
  if (hasAny(text, ["pun", "wordplay", "metaphor", "double meaning"])) return "wordplay";
  if (hasAny(text, ["plot twist", "actually", "turns out"])) return "twist";
  if (hasAny(text, ["me", "myself", "i am", "i m"]) && hasAny(text, ["roast", "clown", "cooked"])) return "self_roast";
  if (hasAny(text, ["lol", "haha", "lmao", "bro", "meme"])) return "funny";
  if (wordCount <= 7 && latest.content.length > 12) return "one_liner";
  if (comebackSignals && latest.content.length > 70) return "nuclear";
  if (comebackSignals) return "comeback";
  if (latest.content.length > 120 || hasAny(text, ["personal", "expired", "value", "personality"])) return "brutal";
  if (wordCount < 4 || latest.content.length < 18) return "weak";
  if (messages.length >= 6) return "legendary";
  return "idle";
}

export function inferCompanionEvent(input: CompanionEventInput, profile: CompanionProfile): CompanionEvent {
  const { battle, messages, user, now } = input;
  const latest = messages[messages.length - 1] ?? null;
  const countdownMs = inferCountdownMs(battle, now);
  const participant = Boolean(user && (user.id === battle.creatorId || user.id === battle.opponentId));
  const winnerIsUser = Boolean(user && battle.winnerId === user.id);
  const userLost = Boolean(participant && battle.status === "completed" && battle.winnerId && !winnerIsUser);

  if (user && user.aura > profile.memory.highestAura) {
    return {
      type: "aura_record",
      at: now,
      battleId: battle.id,
      label: "New Aura peak",
      intensity: 1.18,
      payload: { aura: user.aura },
    };
  }

  if (user && user.currentStreak >= 3 && user.currentStreak > profile.memory.currentStreak) {
    return {
      type: "win_streak",
      at: now,
      battleId: battle.id,
      label: "Win streak rising",
      intensity: 1.08,
      payload: { streak: user.currentStreak },
    };
  }

  if (battle.status === "completed" && winnerIsUser) {
    return {
      type: "battle_won",
      at: now,
      battleId: battle.id,
      label: "Victory",
      intensity: 1.25,
      winnerId: battle.winnerId,
    };
  }

  if (userLost) {
    return {
      type: "battle_lost",
      at: now,
      battleId: battle.id,
      label: "Defeat",
      intensity: 1,
      winnerId: battle.winnerId,
    };
  }

  if (battle.status === "completed") {
    return {
      type: "battle_completed",
      at: now,
      battleId: battle.id,
      label: "Battle complete",
      intensity: 0.82,
      winnerId: battle.winnerId,
    };
  }

  if (input.idleSeconds > 70) {
    return {
      type: "long_inactivity",
      at: now,
      battleId: battle.id,
      label: "Quiet watch",
      intensity: Math.min(1.25, input.idleSeconds / 90),
    };
  }

  if (input.draft.trim().length > 0) {
    return {
      type: "user_typing",
      at: now,
      battleId: battle.id,
      label: "Draft forming",
      intensity: clamp(input.draft.trim().length / 120, 0.45, 1),
    };
  }

  if (countdownMs !== null && countdownMs <= 120_000 && battle.status === "waiting") {
    return {
      type: "countdown_warning",
      at: now,
      battleId: battle.id,
      label: "Countdown pressure",
      intensity: countdownMs < 30_000 ? 1.15 : 0.8,
      payload: { countdownMs },
    };
  }

  if (battle.status === "judging" || battle.status === "pending_review") {
    return {
      type: "judging_ready",
      at: now,
      battleId: battle.id,
      label: "Review phase",
      intensity: battle.status === "pending_review" ? 1.05 : 0.86,
    };
  }

  if (latest && latest.id !== profile.memory.lastMessageId) {
    const playerSide = Boolean(user && latest.userId === user.id);
    const messageFlavor = inferMessageFlavor(messages, latest);
    return {
      type: playerSide ? "player_message" : "opponent_message",
      at: now,
      battleId: battle.id,
      label: messageFlavorMeta[messageFlavor].label,
      intensity: messageFlavorMeta[messageFlavor].intensity,
      messageId: latest.id,
      payload: { latestMessage: latest, messageFlavor },
    };
  }

  if (battle.opponentId && profile.memory.lastBattleStatus === "waiting" && battle.status === "active") {
    return {
      type: "opponent_joined",
      at: now,
      battleId: battle.id,
      label: "Opponent joined",
      intensity: 1,
      payload: { opponentName: battle.opponentUsername },
    };
  }

  if (input.isHovered) {
    return {
      type: "mouse_hover",
      at: now,
      battleId: battle.id,
      label: "Cursor focus",
      intensity: 0.55,
    };
  }

  if (battle.status === "active") {
    return {
      type: "battle_started",
      at: now,
      battleId: battle.id,
      label: "Live battle",
      intensity: 0.82,
    };
  }

  if (battle.status === "waiting") {
    return {
      type: "battle_waiting",
      at: now,
      battleId: battle.id,
      label: "Open challenge",
      intensity: 0.62,
      payload: { opponentName: battle.opponentUsername },
    };
  }

  return {
    type: "idle_tick",
    at: now,
    battleId: battle.id,
    label: "Idle",
    intensity: 0.35,
  };
}

function decayEmotions(emotions: EmotionState, amount: number) {
  return emotionKeys.reduce((next, key) => {
    const value = emotions[key];
    const baseline = baselineEmotions[key];
    const direction = value > baseline ? -amount : amount;
    const moved = Math.abs(value - baseline) <= amount ? baseline : value + direction;
    next[key] = clamp(Math.round(moved));
    return next;
  }, {} as EmotionState);
}

function getDominantEmotion(emotions: EmotionState) {
  return emotionKeys.reduce((best, key) => (emotions[key] > emotions[best] ? key : best), "energy" as EmotionKey);
}

function getMoodScore(emotions: EmotionState) {
  const positive = emotions.happiness + emotions.confidence + emotions.excitement + emotions.pride + emotions.trust + emotions.loyalty;
  const negative = emotions.disappointment + emotions.anger + emotions.confusion + emotions.sleepiness;
  return clamp(Math.round((positive / 6) - negative / 8 + 34));
}

function applyEventDeltas(emotions: EmotionState, event: CompanionEvent, personality: CompanionPersonality) {
  const decayed = decayEmotions(emotions, event.type === "idle_tick" ? 2.6 : 1.5);
  const deltas = eventDeltas[event.type];
  const energyBias = (personality.traits.energetic - 50) / 50;
  const supportBias = (personality.traits.supportive - 50) / 80;
  const competitiveBias = (personality.traits.competitive - 50) / 75;

  return emotionKeys.reduce((next, key) => {
    let delta = (deltas[key] ?? 0) * event.intensity;
    if (key === "energy" || key === "excitement") delta += energyBias * 2;
    if (key === "trust" || key === "loyalty") delta += supportBias * 2;
    if (key === "confidence" || key === "pride") delta += competitiveBias * 2;
    next[key] = clamp(Math.round(decayed[key] + delta));
    return next;
  }, {} as EmotionState);
}

function updateMemory(memory: CompanionMemory, event: CompanionEvent, input: CompanionEventInput, emotions: EmotionState) {
  const battleTypeCounts = { ...memory.battleTypeCounts };
  const topicCounts = { ...memory.topicCounts };
  if (input.battle.battleType) battleTypeCounts[input.battle.battleType] = (battleTypeCounts[input.battle.battleType] ?? 0) + 1;
  if (input.battle.topic) topicCounts[input.battle.topic] = (topicCounts[input.battle.topic] ?? 0) + 1;

  const achievements = new Set(memory.achievements);
  const currentAura = input.user?.aura ?? memory.highestAura;
  if (currentAura >= 1000) achievements.add("1000 Aura");
  if ((input.user?.bestStreak ?? 0) >= 5) achievements.add("5 Win Streak");
  if (event.type === "battle_won") achievements.add("Battle Victory");
  if (event.type === "aura_record") achievements.add("Aura Record");

  const firstSeenAt = memory.firstSeenAt;
  const firstSeenTime = new Date(firstSeenAt).getTime();
  const hoursPlayed = Number.isFinite(firstSeenTime)
    ? Math.max(0, Math.round(((input.now - firstSeenTime) / 3_600_000) * 10) / 10)
    : memory.hoursPlayed;
  const dominantEmotion = getDominantEmotion(emotions);
  const battleChanged = memory.lastBattleId !== input.battle.id;
  const latestMessage = input.messages[input.messages.length - 1] ?? null;

  return {
    ...memory,
    highestAura: Math.max(memory.highestAura, currentAura),
    currentStreak: input.user?.currentStreak ?? memory.currentStreak,
    longestWinStreak: Math.max(memory.longestWinStreak, input.user?.bestStreak ?? 0),
    favoriteBattleType: pickFavorite(battleTypeCounts) ?? memory.favoriteBattleType,
    favoriteOpponent: input.battle.opponentUsername ?? memory.favoriteOpponent,
    lastDefeat: event.type === "battle_lost" ? input.battle.title : memory.lastDefeat,
    lastVictory: event.type === "battle_won" ? input.battle.title : memory.lastVictory,
    dailyLoginStreak: input.user ? Math.max(1, memory.dailyLoginStreak) : memory.dailyLoginStreak,
    recentEmotions: [...memory.recentEmotions.slice(-5), dominantEmotion],
    achievements: Array.from(achievements).slice(-12),
    hoursPlayed,
    battlesSeen: memory.battlesSeen + (battleChanged ? 1 : 0),
    messagesSeen: Math.max(memory.messagesSeen, input.messages.length),
    lastBattleId: input.battle.id,
    lastBattleStatus: input.battle.status,
    lastMessageId: latestMessage?.id ?? memory.lastMessageId,
    lastSeenAt: new Date(input.now).toISOString(),
    battleTypeCounts,
    topicCounts,
  } satisfies CompanionMemory;
}

function pickLine(event: CompanionEvent, personality: CompanionPersonality, memory: CompanionMemory) {
  const personalLines = personalityLines[personality.id]?.[event.type] ?? [];
  const lines = personalLines.length ? personalLines : baseLines[event.type];
  const seed = `${personality.id}:${event.type}:${event.messageId ?? ""}:${event.battleId}:${memory.messagesSeen}`;
  return lines[stableIndex(seed, lines.length)];
}

function decideBase(
  context: BehaviorContext,
  next: {
    state: CompanionState;
    label: string;
    face: string;
    animation: string;
    camera: string;
    effects: string[];
    sound: string;
    focus: CompanionDecision["focus"];
    glow: CompanionDecision["glow"];
    shake?: boolean;
    line?: string;
    intensity?: number;
  }
): Omit<CompanionDecision, "event" | "dominantEmotion" | "moodScore"> {
  return {
    state: resolveState(context.profile.currentState, next.state),
    label: next.label,
    line: next.line ?? pickLine(context.event, context.personality, context.profile.memory),
    face: next.face,
    animation: next.animation,
    camera: next.camera,
    effects: next.effects,
    sound: next.sound,
    focus: next.focus,
    glow: next.glow,
    shake: Boolean(next.shake),
    intensity: next.intensity ?? context.event.intensity,
  };
}

const behaviorTree: BehaviorNode[] = [
  {
    name: "recordAura",
    when: ({ event }) => event.type === "aura_record" || event.type === "new_achievement",
    respond: (context) =>
      decideBase(context, {
        state: "celebrating",
        label: context.event.label,
        face: "proud grin",
        animation: "jump, clap, fireworks burst",
        camera: "champion close-up",
        effects: ["fireworks", "aura flare", "applause"],
        sound: "level up",
        focus: "battle",
        glow: "gold",
        shake: true,
      }),
  },
  {
    name: "win",
    when: ({ event }) => event.type === "battle_won" || event.type === "win_streak",
    respond: (context) =>
      decideBase(context, {
        state: "celebrating",
        label: context.event.label,
        face: "triumphant",
        animation: "raises both hands, claps twice, points at the score",
        camera: "victory pedestal",
        effects: ["confetti", "gold beam", "crowd wave"],
        sound: "final horn",
        focus: "battle",
        glow: "gold",
        shake: true,
      }),
  },
  {
    name: "loss",
    when: ({ event }) => event.type === "battle_lost" || event.type === "losing_streak",
    respond: (context) =>
      decideBase(context, {
        state: "motivating",
        label: context.event.label,
        face: "steady",
        animation: "head down, small sigh, looks back up",
        camera: "calm close-up",
        effects: ["soft pulse", "reset line"],
        sound: "low riser",
        focus: "battle",
        glow: "dim",
      }),
  },
  {
    name: "sleep",
    when: ({ event }) => event.type === "long_inactivity",
    respond: (context) =>
      decideBase(context, {
        state: "sleeping",
        label: "Quiet watch",
        face: "sleepy",
        animation: "breathes slowly, eyelids heavy, idle stretch",
        camera: "soft idle cam",
        effects: ["dim scan", "slow pulse"],
        sound: "standby hum",
        focus: "self",
        glow: "dim",
      }),
  },
  {
    name: "typing",
    when: ({ event }) => event.type === "user_typing",
    respond: (context) =>
      decideBase(context, {
        state: "typing",
        label: "Draft watch",
        face: "focused",
        animation: "eyes track the keyboard, fingers hover over notes",
        camera: "keyboard glance",
        effects: ["cursor trace", "text scan"],
        sound: "soft keys",
        focus: "keyboard",
        glow: "cyan",
      }),
  },
  {
    name: "countdown",
    when: ({ event }) => event.type === "countdown_warning",
    respond: (context) =>
      decideBase(context, {
        state: "pointing",
        label: "Timer pressure",
        face: "alert",
        animation: "points at timer, leans forward",
        camera: "timer cutaway",
        effects: ["countdown", "red tick"],
        sound: "timer ping",
        focus: "battle",
        glow: "red",
        shake: context.event.intensity > 1,
      }),
  },
  {
    name: "message",
    when: ({ event }) => event.type === "player_message" || event.type === "opponent_message",
    respond: (context) => {
      const flavor = context.event.payload?.messageFlavor ?? "idle";
      const meta = messageFlavorMeta[flavor];
      return decideBase(context, {
        state: meta.state,
        label: meta.label,
        face: meta.face,
        animation: meta.animation,
        camera: meta.camera,
        effects: meta.effects,
        sound: meta.sound,
        focus: "battle",
        glow: meta.glow,
        shake: meta.shake,
        intensity: meta.intensity,
      });
    },
  },
  {
    name: "judge",
    when: ({ event }) => event.type === "judging_ready" || event.type === "battle_completed",
    respond: (context) =>
      decideBase(context, {
        state: "analyzing",
        label: context.event.label,
        face: "analytical",
        animation: "projects notes, sorts the transcript, taps verdict panel",
        camera: "analysis desk",
        effects: ["grid", "target lock"],
        sound: "data lock",
        focus: "battle",
        glow: "cyan",
      }),
  },
  {
    name: "opponent",
    when: ({ event }) => event.type === "opponent_joined" || event.type === "battle_started",
    respond: (context) =>
      decideBase(context, {
        state: "excited",
        label: context.event.label,
        face: "alert",
        animation: "straightens up, shoulders square, eyes brighten",
        camera: "arena cam",
        effects: ["live pulse", "red sweep"],
        sound: "arena wake",
        focus: "battle",
        glow: "red",
      }),
  },
  {
    name: "waiting",
    when: ({ event }) => event.type === "battle_waiting" || event.type === "notification",
    respond: (context) =>
      decideBase(context, {
        state: "watching",
        label: context.event.label,
        face: "curious",
        animation: "shifts weight, looks toward the open slot",
        camera: "wide watch",
        effects: ["scan line", "soft ping"],
        sound: "watch ping",
        focus: "notification",
        glow: "white",
      }),
  },
  {
    name: "cursor",
    when: ({ event }) => event.type === "mouse_hover",
    respond: (context) =>
      decideBase(context, {
        state: "waving",
        label: context.event.label,
        face: "small smile",
        animation: "eyes follow cursor, quick wave",
        camera: "front cam",
        effects: ["cursor glint"],
        sound: "soft chirp",
        focus: "cursor",
        glow: "white",
      }),
  },
  {
    name: "idle",
    when: () => true,
    respond: (context) =>
      decideBase(context, {
        state: "idle",
        label: "Standing by",
        face: "neutral",
        animation: "blink, breathe, small weight shift",
        camera: "idle cam",
        effects: ["breath glow", "scan"],
        sound: "sub hum",
        focus: "battle",
        glow: "dim",
      }),
  },
];

export function decideCompanionBehavior(
  profile: CompanionProfile,
  event: CompanionEvent,
  personality: CompanionPersonality
): CompanionDecision {
  const context = { event, profile, personality };
  const node = behaviorTree.find((item) => item.when(context)) ?? behaviorTree[behaviorTree.length - 1];
  const base = node.respond(context);
  const dominantEmotion = getDominantEmotion(profile.emotions);

  return {
    ...base,
    event,
    dominantEmotion,
    moodScore: getMoodScore(profile.emotions),
  };
}

export function advanceCompanionProfile(
  profile: CompanionProfile,
  event: CompanionEvent,
  input: CompanionEventInput,
  personality: CompanionPersonality
): CompanionProfile {
  const emotions = applyEventDeltas(profile.emotions, event, personality);
  const memory = updateMemory(profile.memory, event, input, emotions);
  const provisional = {
    ...profile,
    personalityId: personality.id,
    emotions,
    memory,
  };
  const decision = decideCompanionBehavior(provisional, event, personality);
  return {
    ...provisional,
    currentState: decision.state,
  };
}

export function companionEventSignature(event: CompanionEvent) {
  const idleBucket = event.type === "idle_tick" || event.type === "long_inactivity" ? Math.floor(event.at / 30_000) : "";
  return [
    event.type,
    event.battleId,
    event.messageId ?? "",
    event.winnerId ?? "",
    event.payload?.aura ?? "",
    event.payload?.streak ?? "",
    idleBucket,
  ].join(":");
}
