"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

type Difficulty = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster" | "Legend" | "Mythic";
type LanguageMode = "Auto" | "English" | "Hindi" | "Hinglish" | "Telugu" | "Tamil" | "Kannada" | "Malayalam" | "Marathi" | "Punjabi" | "Urdu";

type Opponent = {
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

type BattleAiPayload = {
  battle: {
    id: string;
    title: string;
    topic: string;
    difficulty: Difficulty;
    language_mode: LanguageMode;
    status: "active" | "completed" | "abandoned";
    rounds: number;
    current_round: number;
    winner: "player" | "ai" | "draw" | null;
    judge_result: any;
    quality_report: any;
    reward_result: any;
    ai_disclosure: string;
    created_at: string;
    completed_at: string | null;
  };
  opponent: Opponent;
  messages: {
    id: string;
    sender_type: "player" | "ai";
    content: string;
    round: number;
    created_at: string;
  }[];
  reward: {
    aura_awarded: number;
    xp_awarded: number;
    coins_awarded: number;
    achievements: string[];
    badges: string[];
    performance_rating: number;
    quality_score: number;
    reward_reduction_reason: string | null;
  } | null;
  disclosure: string;
};

type Catalog = {
  disclosure: string;
  difficulties: { name: Difficulty; multiplier: number; speed: string; depth: number }[];
  languages: LanguageMode[];
  suggestedTopics: string[];
  opponents: Opponent[];
  source?: "database" | "fallback";
};

function avatarFor(opponent: Opponent | null | undefined) {
  return opponent?.avatar_url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(opponent?.slug ?? "battle-ai")}`;
}

function isCatalog(value: unknown): value is Catalog {
  const data = value as Partial<Catalog> | null;
  return Boolean(
    data &&
      Array.isArray(data.opponents) &&
      Array.isArray(data.difficulties) &&
      Array.isArray(data.languages) &&
      Array.isArray(data.suggestedTopics)
  );
}

export default function BattleAiPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [active, setActive] = useState<BattleAiPayload | null>(null);
  const [opponentSlug, setOpponentSlug] = useState("sigma-king");
  const [difficulty, setDifficulty] = useState<Difficulty>("Gold");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("Auto");
  const [topic, setTopic] = useState("Memes as modern philosophy");
  const [rounds, setRounds] = useState(3);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/battle-ai/catalog")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !isCatalog(data)) return null;
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setCatalog(data);
        if (data?.opponents?.[0] && !data.opponents.some((opponent: Opponent) => opponent.slug === opponentSlug)) {
          setOpponentSlug(data.opponents[0].slug);
        }
      })
      .catch(() => setCatalog(null));
    return () => {
      cancelled = true;
    };
  }, [opponentSlug]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/battle-ai", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { battles: [] }))
      .then((data) => setHistory(data.battles ?? []))
      .catch(() => setHistory([]));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

  const catalogOpponents = Array.isArray(catalog?.opponents) ? catalog.opponents : [];
  const catalogDifficulties = Array.isArray(catalog?.difficulties) ? catalog.difficulties : [];
  const catalogLanguages = Array.isArray(catalog?.languages) ? catalog.languages : ["Auto"];
  const suggestedTopics = Array.isArray(catalog?.suggestedTopics) ? catalog.suggestedTopics : [];
  const opponent = catalogOpponents.find((item) => item.slug === opponentSlug) ?? catalogOpponents[0] ?? null;
  const selectedDifficulty = catalogDifficulties.find((item) => item.name === difficulty);

  async function startBattle() {
    if (!user) {
      setError("Log in to use Battle AI.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/battle-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ opponentSlug, difficulty, languageMode, topic, rounds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start Battle AI.");
        return;
      }
      setActive(data.battle);
      setMessage("");
    } catch {
      setError("Could not reach Battle AI.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/battle-ai/${active.battle.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send message.");
        return;
      }
      setActive(data.battle);
      setMessage("");
    } catch {
      setError("Could not reach Battle AI.");
    } finally {
      setBusy(false);
    }
  }

  const playerScore = active?.battle.judge_result?.scores?.creator?.total ?? null;
  const aiScore = active?.battle.judge_result?.scores?.opponent?.total ?? null;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-aura-purple">Battle AI</p>
          <h1 className="mt-1 font-display text-4xl font-black leading-none tracking-tight">
            Fight a clearly labelled AI
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/45">
            {catalog?.disclosure ?? "AI opponents are labelled and separate from player-vs-player battles."}
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <img src={user.avatar_url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}`} alt={user.username} className="h-9 w-9 rounded-xl border border-aura-purple/40" />
            <div>
              <p className="text-sm font-bold text-white">{user.username}</p>
              <AuraBadge value={user.aura} size="xs" trend="neutral" />
            </div>
          </div>
        )}
      </div>

      {!user && !userLoading ? (
        <div className="card-surface rounded-3xl p-8 text-center">
          <p className="font-display text-2xl font-black">Log in to enter Battle AI</p>
          <Link href="/login" className="mt-5 inline-block">
            <Button>Log in</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
          <aside className="space-y-5">
            <section className="card-surface rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Opponent</p>
                  <h2 className="font-display text-xl font-black">{opponent?.display_name ?? "Loading"}</h2>
                </div>
                {opponent && <img src={avatarFor(opponent)} alt={opponent.display_name} className="h-14 w-14 rounded-2xl border border-aura-purple/45" />}
              </div>

              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {catalogOpponents.map((item) => (
                  <button
                    key={item.slug}
                    onClick={() => setOpponentSlug(item.slug)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                      item.slug === opponentSlug
                        ? "border-aura-purple/45 bg-aura-purple/12"
                        : "border-white/8 bg-white/[0.025] hover:border-white/18"
                    }`}
                  >
                    <img src={avatarFor(item)} alt={item.display_name} className="h-9 w-9 rounded-xl border border-white/10" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{item.display_name}</span>
                      <span className="block truncate text-[11px] text-white/40">{item.title}</span>
                    </span>
                  </button>
                ))}
              </div>

              {opponent && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Signal label="Humor" value={opponent.humor_style} />
                  <Signal label="Language" value={opponent.language_preference} />
                  <Signal label="Reasoning" value={opponent.reasoning} />
                  <Signal label="Creativity" value={opponent.creativity} />
                </div>
              )}
            </section>

            <section className="card-surface rounded-3xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Match Setup</p>
              <div className="mt-3 grid gap-3">
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-aura-purple/45 focus:outline-none">
                  {catalogDifficulties.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <select value={languageMode} onChange={(e) => setLanguageMode(e.target.value as LanguageMode)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-aura-purple/45 focus:outline-none">
                  {catalogLanguages.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-aura-purple/45 focus:outline-none" placeholder="Battle topic" />
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                    <span>Rounds</span>
                    <span>{rounds}</span>
                  </div>
                  <input type="range" min={1} max={5} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="w-full accent-[#ff1e1e]" />
                </div>
                {selectedDifficulty && (
                  <div className="grid grid-cols-3 gap-2">
                    <Signal label="Multiplier" value={`${selectedDifficulty.multiplier}x`} />
                    <Signal label="Depth" value={selectedDifficulty.depth} />
                    <Signal label="Speed" value={selectedDifficulty.speed} />
                  </div>
                )}
                <Button onClick={startBattle} disabled={busy || !opponent || !user} className="w-full">
                  {busy ? "Starting..." : "Start Battle AI"}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedTopics.slice(0, 6).map((item) => (
                  <button key={item} onClick={() => setTopic(item)} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] font-bold text-white/50 hover:border-aura-purple/35 hover:text-white">
                    {item}
                  </button>
                ))}
              </div>
            </section>

            {history.length > 0 && (
              <section className="card-surface rounded-3xl p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Recent Battle AI</p>
                <div className="mt-3 space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={async () => {
                        const res = await fetch(`/api/battle-ai/${item.id}`, { credentials: "include" });
                        if (res.ok) setActive((await res.json()).battle);
                      }}
                      className="block w-full rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-left hover:border-white/18"
                    >
                      <p className="truncate text-sm font-bold">{item.topic}</p>
                      <p className="mt-1 text-[11px] text-white/38">{item.display_name} / {item.difficulty} / {item.status}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>

          <main className="min-h-[720px] rounded-3xl border border-white/10 bg-[#080808] shadow-[0_0_80px_rgba(255,30,30,0.08)]">
            {active ? (
              <div className="flex min-h-[720px] flex-col">
                <div className="border-b border-white/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={avatarFor(active.opponent)} alt={active.opponent.display_name} className="h-12 w-12 rounded-2xl border border-aura-purple/45" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl font-black">{active.opponent.display_name}</h2>
                          <span className="rounded-full border border-aura-purple/30 bg-aura-purple/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-aura-purple">AI Opponent</span>
                        </div>
                        <p className="mt-1 text-xs text-white/42">{active.battle.topic} / {active.battle.difficulty} / {active.battle.language_mode}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                      active.battle.status === "completed"
                        ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}>
                      {active.battle.status}
                    </span>
                  </div>
                  <p className="mt-3 rounded-2xl border border-aura-purple/20 bg-aura-purple/[0.06] px-3 py-2 text-xs font-semibold text-aura-purple">
                    {active.disclosure}
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {active.messages.length === 0 ? (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <p className="font-display text-2xl font-black">Round 1 is yours</p>
                        <p className="mt-2 text-sm text-white/40">Topic: {active.battle.topic}</p>
                      </div>
                    </div>
                  ) : (
                    active.messages.map((item) => (
                      <div key={item.id} className={`flex ${item.sender_type === "player" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${
                          item.sender_type === "player"
                            ? "border-aura-purple/30 bg-aura-purple/12"
                            : "border-white/10 bg-white/[0.04]"
                        }`}>
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                            {item.sender_type === "player" ? user?.username ?? "You" : `${active.opponent.display_name} / AI`}
                          </p>
                          <p className="text-sm leading-relaxed text-white/82">{item.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                {active.battle.status === "completed" ? (
                  <div className="border-t border-white/8 p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <Signal label="Winner" value={active.battle.winner ?? "draw"} />
                      <Signal label="Your Score" value={playerScore ?? 0} />
                      <Signal label="AI Score" value={aiScore ?? 0} />
                      <Signal label="Quality" value={active.reward?.quality_score ?? active.battle.quality_report?.qualityScore ?? 0} />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <Signal label="Aura" value={active.reward?.aura_awarded ?? 0} />
                      <Signal label="XP" value={active.reward?.xp_awarded ?? 0} />
                      <Signal label="Coins" value={active.reward?.coins_awarded ?? 0} />
                      <Signal label="Rating" value={active.reward?.performance_rating ?? 0} />
                    </div>
                    {active.reward?.reward_reduction_reason && (
                      <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                        {active.reward.reward_reduction_reason}
                      </p>
                    )}
                    {active.reward && (active.reward.achievements?.length > 0 || active.reward.badges?.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[...(active.reward.achievements ?? []), ...(active.reward.badges ?? [])].map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/55">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={sendMessage} className="border-t border-white/8 p-4">
                    <div className="flex gap-2">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        maxLength={1000}
                        className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-white/28 focus:border-aura-purple/45 focus:outline-none"
                        placeholder={`Round ${active.battle.current_round}/${active.battle.rounds}`}
                      />
                      <Button type="submit" disabled={busy || !message.trim()} className="self-stretch px-6">
                        Send
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="grid min-h-[720px] place-items-center p-8 text-center">
                <div>
                  <p className="font-display text-3xl font-black">Choose an AI opponent</p>
                  <p className="mt-2 max-w-md text-sm text-white/42">Battle AI matches are labelled, rewarded, and separate from human battles.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {error && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-aura-purple/35 bg-[#120606] px-4 py-3 text-sm font-semibold text-aura-purple shadow-[0_12px_60px_rgba(0,0,0,0.65)]">
          {error}
        </div>
      )}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white/80">{String(value)}</p>
    </div>
  );
}
