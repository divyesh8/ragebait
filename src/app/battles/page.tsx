"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import CreateBattleForm from "@/components/battle/CreateBattleForm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface BattleListItem {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: "waiting" | "active" | "judging" | "completed" | "cancelled" | "expired";
  rounds: number;
  winner_id: string | null;
  ai_summary: string | null;
  created_at: string;
  expires_at: string | null;
  creator_id: string;
  creator_user_id: string;
  creator_username: string;
  creator_avatar: string;
  creator_playstyle?: string | null;
  creator_strengths?: string[] | null;
  creator_weaknesses?: string[] | null;
  creator_average_creativity?: number | null;
  creator_average_logic?: number | null;
  creator_average_humor?: number | null;
  creator_average_originality?: number | null;
  creator_average_comeback?: number | null;
  creator_average_entertainment?: number | null;
  opponent_id: string | null;
  opponent_user_id: string | null;
  opponent_username: string | null;
  opponent_avatar: string | null;
}

const statusConfig: Record<string, { label: string; cls: string; dot?: boolean }> = {
  waiting: { label: "Open — needs opponent", cls: "text-white/60" },
  active: { label: "Live Now", cls: "text-aura-purple", dot: true },
  judging: { label: "AI Judging…", cls: "text-white/60" },
  completed: { label: "Completed", cls: "text-white/30" },
  cancelled: { label: "Cancelled", cls: "text-white/25" },
  expired: { label: "Expired", cls: "text-white/25" },
};

function avatarFor(u: string, url: string | null) {
  return url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(u)}`;
}

function averageCreatorScore(battle: BattleListItem) {
  const scores = [
    battle.creator_average_creativity,
    battle.creator_average_logic,
    battle.creator_average_humor,
    battle.creator_average_originality,
    battle.creator_average_comeback,
    battle.creator_average_entertainment,
  ]
    .map((score) => Number(score) || 0)
    .filter((score) => score > 0);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export default function BattlesPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeSearching, setCodeSearching] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const loadBattles = useCallback(async () => {
    try {
      const res = await fetch("/api/battles");
      const data = await res.json();
      setBattles(data.battles ?? []);
    } catch { setBattles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadBattles();
    const interval = setInterval(loadBattles, 8000);
    return () => clearInterval(interval);
  }, [loadBattles]);

  async function handleJoin(battleId: string) {
    if (!user) { setError("Log in to join a battle."); return; }
    setJoiningId(battleId); setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not join this battle."); setJoiningId(null); return; }
      window.location.href = `/battles/${battleId}`;
    } catch { setError("Could not reach the server."); setJoiningId(null); }
  }

  async function handleCodeSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setCodeSearching(true); setCodeError(null);
    try {
      const res = await fetch(`/api/battles/code/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { setCodeError(data.error ?? "No battle found."); return; }
      router.push(`/battles/${data.battle.id}`);
    } catch { setCodeError("Could not reach the server."); }
    finally { setCodeSearching(false); }
  }

  const liveBattles = battles.filter((b) => b.status === "active");
  const waitingBattles = battles.filter((b) => b.status === "waiting");
  const doneBattles = battles.filter((b) => !["active","waiting"].includes(b.status));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

      {/* ─── PAGE HEADER ─── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-aura-purple mb-1">⚔️ Arena</p>
          <h1 className="font-display text-4xl font-black leading-none tracking-tight">
            Battle<span className="text-gradient-rage">ground</span>
          </h1>
          <p className="mt-2 text-sm text-white/45">
            Real roast battles, judged by AI. Create one, get an opponent, trade fire.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button size="md" onClick={() => setShowCreate(true)}>
              ⚔️ Start a Battle
            </Button>
          ) : (
            <Link href="/login"><Button size="md" variant="secondary">Log in to battle</Button></Link>
          )}
        </div>
      </div>

      {/* ─── CODE SEARCH ─── */}
      <form onSubmit={handleCodeSearch} className="mb-8 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-md focus-within:border-aura-purple/50 focus-within:shadow-glow-sm transition-all">
          <svg className="h-4 w-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" strokeLinecap="round" />
          </svg>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter battle code (e.g. X7K2PQ)"
            maxLength={8}
            className="w-64 bg-transparent text-sm font-mono uppercase tracking-wider text-white placeholder:text-white/25 placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus:outline-none"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={codeSearching}>
          {codeSearching ? "Searching…" : "Find Battle"}
        </Button>
        {codeError && <span className="text-xs font-semibold text-aura-purple">{codeError}</span>}
      </form>

      {error && (
        <div className="mb-6 rounded-2xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm font-semibold text-aura-purple">
          {error}
        </div>
      )}

      {/* ─── LIVE SECTION ─── */}
      {liveBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-black">
            <span className="h-2 w-2 rounded-full bg-aura-purple animate-pulseGlow shadow-[0_0_8px_rgba(255,30,30,0.9)]" />
            Live Right Now
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} user={user} joiningId={joiningId} onJoin={handleJoin} hot />
            ))}
          </div>
        </section>
      )}

      {/* ─── OPEN / WAITING ─── */}
      {waitingBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-black text-white/80">Open Challenges</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {waitingBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} user={user} joiningId={joiningId} onJoin={handleJoin} />
            ))}
          </div>
        </section>
      )}

      {/* ─── COMPLETED ─── */}
      {doneBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-base font-bold text-white/40">Past Battles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doneBattles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} user={user} joiningId={joiningId} onJoin={handleJoin} dim />
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      )}

      {!loading && battles.length === 0 && (
        <div className="card-surface rounded-3xl flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-5xl">⚔️</span>
          <p className="font-display text-2xl font-black">No battles yet</p>
          <p className="text-sm text-white/40">Be the first to ignite the arena.</p>
          {user && <Button onClick={() => setShowCreate(true)}>Start a Battle</Button>}
        </div>
      )}

      {showCreate && (
        <CreateBattleForm onCreated={loadBattles} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function BattleCard({
  battle, user, joiningId, onJoin, hot, dim
}: {
  battle: BattleListItem;
  user: { id: string } | null | undefined;
  joiningId: string | null;
  onJoin: (id: string) => void;
  hot?: boolean;
  dim?: boolean;
}) {
  const sc = statusConfig[battle.status] ?? { label: battle.status, cls: "text-white/30" };
  const canJoin = battle.status === "waiting" && user && battle.creator_id !== user.id;

  return (
    <div className={`card-surface group relative flex flex-col gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 ${
      hot ? "border-aura-purple/30 shadow-[0_0_30px_rgba(255,30,30,0.15)] hover:shadow-[0_0_50px_rgba(255,30,30,0.25)]" : "hover:border-white/18"
    } ${dim ? "opacity-55 hover:opacity-80" : ""}`}>

      {hot && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-aura-purple/5 to-transparent" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/60">
          {battle.topic}
        </span>
        <span className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide ${sc.cls}`}>
          {sc.dot && <span className="h-1.5 w-1.5 rounded-full bg-aura-purple animate-pulseGlow shadow-[0_0_6px_rgba(255,30,30,0.9)]" />}
          {sc.label}
        </span>
      </div>

      <h3 className="font-display text-lg font-black leading-snug">{battle.title}</h3>

      {/* Players */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
          <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-5 w-5 rounded-full" />
          <Link href={`/profile/${battle.creator_user_id}`} className="leading-none hover:text-aura-purple">
            <span className="block text-xs font-semibold text-white/70">{battle.creator_username}</span>
            <span className="block font-mono text-[9px] text-white/30">{battle.creator_user_id}</span>
          </Link>
        </div>
        {battle.opponent_username ? (
          <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
            <img src={avatarFor(battle.opponent_username, battle.opponent_avatar)} alt={battle.opponent_username} className="h-5 w-5 rounded-full" />
            <Link href={`/profile/${battle.opponent_user_id ?? battle.opponent_username}`} className="leading-none hover:text-aura-purple">
              <span className="block text-xs font-semibold text-white/70">{battle.opponent_username}</span>
              <span className="block font-mono text-[9px] text-white/30">{battle.opponent_user_id}</span>
            </Link>
          </div>
        ) : (
          <span className="text-xs text-white/25 italic">+ awaiting opponent…</span>
        )}
      </div>

      {battle.ai_summary && (
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3 text-xs text-white/50 italic leading-relaxed">
          &ldquo;{battle.ai_summary}&rdquo;
        </div>
      )}

      {canJoin && (
        <div className="rounded-xl border border-aura-purple/20 bg-aura-purple/[0.06] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-aura-purple">Opponent Insight</p>
            {averageCreatorScore(battle) !== null && (
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[11px] text-white/55">
                avg {averageCreatorScore(battle)}
              </span>
            )}
          </div>
          <div className="grid gap-2 text-xs text-white/50">
            <p>
              Style:{" "}
              <span className="font-semibold text-white/70">
                {battle.creator_playstyle ?? "Balanced"}
              </span>
            </p>
            <p>
              Strong:{" "}
              <span className="text-white/65">
                {battle.creator_strengths?.slice(0, 2).join(", ") || "not enough data yet"}
              </span>
            </p>
            <p>
              Weak:{" "}
              <span className="text-white/65">
                {battle.creator_weaknesses?.slice(0, 2).join(", ") || "unknown"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between text-[11px] text-white/30 font-mono">
        <span className="capitalize">{battle.battle_type} · {battle.mode}</span>
        <span>#{battle.battle_code}</span>
      </div>

      {canJoin ? (
        <Button variant="primary" size="sm" className="w-full" onClick={() => onJoin(battle.id)} disabled={joiningId === battle.id}>
          {joiningId === battle.id ? "Joining…" : "⚔️ Join Battle"}
        </Button>
      ) : (
        <Link href={`/battles/${battle.id}`}>
          <Button variant={hot ? "secondary" : "ghost"} size="sm" className="w-full">
            {battle.status === "completed" || battle.status === "judging" ? "View Result" : "Open Battle →"}
          </Button>
        </Link>
      )}
    </div>
  );
}
