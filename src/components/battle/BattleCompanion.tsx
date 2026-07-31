"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  advanceCompanionProfile,
  companionEventSignature,
  companionPersonalities,
  createCompanionProfile,
  decideCompanionBehavior,
  inferCompanionEvent,
  normalizeCompanionProfile,
  type CompanionBattleSnapshot,
  type CompanionEventInput,
  type CompanionMessageSnapshot,
  type CompanionPersonalityId,
  type CompanionProfile,
  type CompanionState,
  type CompanionUserSnapshot,
  type EmotionKey,
} from "@/services/companionBehavior";

interface BattleCompanionBattle {
  id: string;
  title: string;
  status: string;
  topic: string;
  battle_type: string;
  mode: string;
  rounds: number;
  winner_id: string | null;
  creator_id: string;
  creator_username: string;
  opponent_id: string | null;
  opponent_username: string | null;
  expires_at: string | null;
}

interface BattleCompanionMessage {
  id: string;
  content: string;
  round: number;
  created_at: string;
  user_id: string;
  username: string;
}

interface BattleCompanionUser {
  id: string;
  username: string;
  aura: number;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
}

interface BattleCompanionProps {
  battle: BattleCompanionBattle;
  messages: BattleCompanionMessage[];
  user: BattleCompanionUser | null | undefined;
  draft: string;
}

const emotionLabels: Record<EmotionKey, string> = {
  happiness: "Happiness",
  confidence: "Confidence",
  excitement: "Excitement",
  curiosity: "Curiosity",
  respect: "Respect",
  energy: "Energy",
  pride: "Pride",
  disappointment: "Disappointment",
  shock: "Shock",
  anger: "Anger",
  confusion: "Confusion",
  sleepiness: "Sleepiness",
  trust: "Trust",
  loyalty: "Loyalty",
};

const stateLabels: Record<CompanionState, string> = {
  idle: "Idle",
  watching: "Watching",
  thinking: "Thinking",
  excited: "Excited",
  celebrating: "Celebrating",
  laughing: "Laughing",
  surprised: "Surprised",
  sad: "Sad",
  angry: "Focused",
  motivating: "Motivating",
  sleeping: "Resting",
  greeting: "Greeting",
  waving: "Waving",
  pointing: "Pointing",
  clapping: "Clapping",
  facepalm: "Resetting",
  confused: "Checking",
  typing: "Typing",
  analyzing: "Analyzing",
};

const companionMeterKeys: EmotionKey[] = ["happiness", "confidence", "excitement", "energy"];

function profileStorageKey(userId: string | null) {
  return `ragebait.companion.${userId ?? "guest"}`;
}

function toBattleSnapshot(battle: BattleCompanionBattle): CompanionBattleSnapshot {
  return {
    id: battle.id,
    title: battle.title,
    topic: battle.topic,
    battleType: battle.battle_type,
    mode: battle.mode,
    status: battle.status,
    rounds: battle.rounds,
    winnerId: battle.winner_id,
    creatorId: battle.creator_id,
    creatorUsername: battle.creator_username,
    opponentId: battle.opponent_id,
    opponentUsername: battle.opponent_username,
    expiresAt: battle.expires_at,
  };
}

function toMessageSnapshots(messages: BattleCompanionMessage[]): CompanionMessageSnapshot[] {
  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    round: message.round,
    createdAt: message.created_at,
    userId: message.user_id,
    username: message.username,
  }));
}

function toUserSnapshot(user: BattleCompanionUser | null | undefined): CompanionUserSnapshot | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    aura: user.aura,
    wins: user.wins,
    losses: user.losses,
    currentStreak: user.current_streak,
    bestStreak: user.best_streak,
  };
}

function movementForState(state: CompanionState, intense: boolean) {
  if (state === "celebrating" || state === "clapping") {
    return {
      y: [0, -10, 0, -5, 0],
      rotate: [0, -2, 2, 0],
      scale: intense ? [1, 1.05, 0.98, 1.02, 1] : [1, 1.03, 1],
      transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.7 },
    };
  }
  if (state === "laughing" || state === "surprised") {
    return {
      y: [0, -7, 0],
      rotate: [0, 1.5, -1.5, 0],
      transition: { duration: 1.1, repeat: Infinity, repeatDelay: 0.45 },
    };
  }
  if (state === "sleeping") {
    return {
      y: [0, 4, 0],
      rotate: [0, -1, 0],
      opacity: [0.78, 0.92, 0.78],
      transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
    };
  }
  if (state === "facepalm" || state === "motivating") {
    return {
      x: [0, -2, 2, 0],
      y: [0, 2, 0],
      transition: { duration: 1.8, repeat: Infinity, repeatDelay: 0.8 },
    };
  }
  if (state === "typing" || state === "analyzing" || state === "thinking") {
    return {
      y: [0, -4, 0],
      scale: [1, 1.015, 1],
      transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    };
  }
  return {
    y: [0, -5, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  };
}

function formatMemoryValue(value: string | number | null) {
  if (value === null || value === "") return "Learning";
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export default function BattleCompanion({ battle, messages, user, draft }: BattleCompanionProps) {
  const userSnapshot = useMemo(() => toUserSnapshot(user), [user]);
  const [now, setNow] = useState(() => Date.now());
  const [profile, setProfile] = useState<CompanionProfile>(() => createCompanionProfile(userSnapshot, "ember"));
  const [isHovered, setIsHovered] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const lastActivityRef = useRef(lastActivityAt);
  const lastSignatureRef = useRef("");
  const storageKey = useMemo(() => profileStorageKey(userSnapshot?.id ?? null), [userSnapshot?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setProfile(normalizeCompanionProfile(parsed, userSnapshot, "ember", Date.now()));
      lastSignatureRef.current = "";
    } catch {
      setProfile(createCompanionProfile(userSnapshot, "ember", Date.now()));
      lastSignatureRef.current = "";
    }
  }, [storageKey, userSnapshot]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {
      // Local storage is a convenience memory layer; the companion still works without it.
    }
  }, [profile, storageKey]);

  useEffect(() => {
    function markActivity() {
      const next = Date.now();
      if (next - lastActivityRef.current < 900) return;
      lastActivityRef.current = next;
      setLastActivityAt(next);
    }

    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("focus", markActivity);
    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("focus", markActivity);
    };
  }, []);

  const battleSnapshot = useMemo(() => toBattleSnapshot(battle), [battle]);
  const messageSnapshots = useMemo(() => toMessageSnapshots(messages), [messages]);
  const idleSeconds = Math.max(0, Math.floor((now - lastActivityAt) / 1000));
  const input = useMemo<CompanionEventInput>(
    () => ({
      battle: battleSnapshot,
      messages: messageSnapshots,
      user: userSnapshot,
      draft,
      isHovered,
      idleSeconds,
      now,
    }),
    [battleSnapshot, messageSnapshots, userSnapshot, draft, isHovered, idleSeconds, now]
  );

  const personality = companionPersonalities[profile.personalityId];
  const event = useMemo(() => inferCompanionEvent(input, profile), [input, profile]);
  const decision = useMemo(() => decideCompanionBehavior(profile, event, personality), [event, personality, profile]);
  const signature = companionEventSignature(event);

  useEffect(() => {
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;
    setProfile((current) => {
      const currentPersonality = companionPersonalities[current.personalityId];
      const currentEvent = inferCompanionEvent(input, current);
      return advanceCompanionProfile(current, currentEvent, input, currentPersonality);
    });
  }, [input, signature]);

  function changePersonality(personalityId: CompanionPersonalityId) {
    setProfile((current) => ({
      ...current,
      personalityId,
    }));
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
    setLook({ x, y });
    const next = Date.now();
    lastActivityRef.current = next;
    setLastActivityAt(next);
  }

  const stageStyle = {
    "--look-x": `${look.x}px`,
    "--look-y": `${look.y}px`,
  } as CSSProperties;

  const latest = messages[messages.length - 1] ?? null;
  const secondsSinceLast = latest?.created_at
    ? Math.max(0, Math.floor((now - new Date(latest.created_at).getTime()) / 1000))
    : null;
  const memory = profile.memory;

  return (
    <aside className={clsx("companion-shell", decision.shake && "companion-shake")} aria-label="Ragebait battle companion">
      <div
        className={clsx("companion-stage", `companion-glow-${decision.glow}`, `companion-state-${decision.state}`)}
        style={stageStyle}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => {
          setIsHovered(false);
          setLook({ x: 0, y: 0 });
        }}
      >
        <div className={clsx("absolute inset-0 bg-gradient-to-br", personality.accent)} aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Ragebait Companion</p>
            <h2 className="mt-1 font-display text-xl font-black tracking-tight">{personality.name}</h2>
            <p className="mt-1 text-xs text-white/45">{personality.role}</p>
          </div>
          <span className="rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/60">
            {stateLabels[decision.state]}
          </span>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          <img
            src="/companion-reference.png"
            alt="Ragebait companion reference"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78),rgba(0,0,0,0.12),rgba(0,0,0,0.84))]" />
          <div className="absolute inset-0 companion-scan" aria-hidden="true" />
          <div className="relative min-h-[300px] p-4">
            <div className="absolute left-4 top-4 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Read</p>
              <p className="mt-0.5 text-xs font-semibold text-white/80">{decision.label}</p>
            </div>

            <div className="absolute right-4 top-4 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Mood</p>
              <p className="mt-0.5 text-xs font-semibold text-white/80">{emotionLabels[decision.dominantEmotion]}</p>
            </div>

            <motion.div
              key={`${decision.state}-${event.messageId ?? event.type}`}
              className="companion-bot"
              animate={movementForState(decision.state, decision.intensity > 1)}
            >
              <div className="companion-antenna left-5" />
              <div className="companion-antenna right-5" />
              <div className="companion-head">
                <div className="companion-face">
                  <span className="companion-eye" />
                  <span className="companion-eye" />
                </div>
                <div className={clsx("companion-mouth", decision.state)} />
              </div>
              <div className="companion-neck" />
              <div className="companion-body">
                <div className="companion-core" />
                <div className="companion-arm left-[-34px] rotate-[-22deg]" />
                <div className="companion-arm right-[-34px] rotate-[22deg]" />
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${decision.event.type}-${decision.line}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl border border-white/12 bg-black/65 p-4 shadow-[0_0_35px_rgba(0,0,0,0.45)] backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-sm font-black uppercase tracking-wider text-white">{decision.label}</p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/45">
                    {decision.sound}
                  </span>
                </div>
                <p className="mt-2 break-words text-lg font-black leading-snug text-white">{decision.line}</p>
              </motion.div>
            </AnimatePresence>

            {decision.effects.map((effect, index) => (
              <span
                key={`${effect}-${index}`}
                className="companion-particle"
                style={{
                  left: `${18 + index * 23}%`,
                  animationDelay: `${index * 0.22}s`,
                }}
              >
                {effect}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <Meter label="Mood" value={decision.moodScore} tone={decision.glow === "gold" ? "gold" : "red"} />
          <Meter label="Energy" value={profile.emotions.energy} tone="cyan" />
          <Meter label="Trust" value={profile.emotions.trust} tone="white" />
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          {companionMeterKeys.map((key) => (
            <Meter key={key} label={emotionLabels[key]} value={profile.emotions[key]} tone={key === "sleepiness" ? "white" : "red"} compact />
          ))}
        </div>

        <div className="relative mt-4 grid gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-white/48">
          <div className="flex justify-between gap-3">
            <span>Highest Aura</span>
            <span className="font-mono text-white/70">{formatMemoryValue(memory.highestAura)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Current Streak</span>
            <span className="font-mono text-white/70">{formatMemoryValue(memory.currentStreak)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Favorite Type</span>
            <span className="max-w-[160px] truncate font-semibold text-white/72">{formatMemoryValue(memory.favoriteBattleType)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Last Response</span>
            <span className="font-mono text-white/70">{secondsSinceLast === null ? "none" : `${secondsSinceLast}s ago`}</span>
          </div>
        </div>

        <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1">
          {Object.values(companionPersonalities).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changePersonality(item.id)}
              className={clsx(
                "min-w-[124px] rounded-xl border px-3 py-2 text-left transition",
                profile.personalityId === item.id
                  ? "border-aura-purple/60 bg-aura-purple/15 text-white shadow-glow-sm"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"
              )}
            >
              <span className="block text-xs font-black">{item.name}</span>
              <span className="mt-1 block text-[10px] leading-snug text-white/40">
                {item.traits.supportive > item.traits.aggressive ? "supportive" : item.traits.funny > 80 ? "funny" : "competitive"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Meter({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: number;
  tone: "red" | "gold" | "cyan" | "white";
  compact?: boolean;
}) {
  const color =
    tone === "gold"
      ? "from-amber-300 to-orange-500"
      : tone === "cyan"
      ? "from-cyan-300 to-blue-500"
      : tone === "white"
      ? "from-white to-zinc-400"
      : "from-aura-purple to-red-500";

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</span>
        <span className="font-mono text-[10px] text-white/60">{Math.round(value)}%</span>
      </div>
      <div className={clsx("mt-2 overflow-hidden rounded-full bg-white/8", compact ? "h-1.5" : "h-2")}>
        <motion.div
          className={clsx("h-full rounded-full bg-gradient-to-r", color)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
