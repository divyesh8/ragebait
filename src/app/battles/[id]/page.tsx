"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuraBadge from "@/components/ui/AuraBadge";
import BattleCompanion from "@/components/battle/BattleCompanion";
import BattleDirectorPanel from "@/components/battle/BattleDirectorPanel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { buildBattleDirectorReport, type BattleAiScores } from "@/services/battleDirector";

interface BattleDetail {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: "waiting" | "active" | "judging" | "pending_review" | "completed" | "cancelled" | "expired" | "deleted";
  rounds: number;
  winner_id: string | null;
  ai_summary: string | null;
  ai_scores: BattleAiScores | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  creator_id: string;
  creator_username: string;
  creator_avatar: string;
  opponent_id: string | null;
  opponent_username: string | null;
  opponent_avatar: string | null;
}

interface BattleMessage {
  id: string;
  content: string;
  round: number;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string;
}

interface ScoreSet {
  creativity: number; logic: number; humor: number;
  originality: number; comeback: number; entertainment: number;
}

interface CoachingResult {
  strengths: string[];
  weaknesses: string[];
  repeatedMistakes: string[];
  improvementSuggestions: string[];
  practiceGoal: string;
  coachFeedback: string;
  playstyle: string;
  scores: ScoreSet;
  progression: { metric: keyof ScoreSet; from: number; to: number }[] | null;
  profile: {
    totalReviews: number;
    averages: ScoreSet;
    preferredStyle: string;
    topStrengths: string[];
    topWeaknesses: string[];
  };
}

interface OpponentInsight {
  opponentStyle: string;
  strengths: string[];
  weaknesses: string[];
  averageScores: ScoreSet;
  favoriteTopics: string[];
  recentPerformance: string;
  summary: string;
  compatibility?: {
    score: number;
    difficulty: string;
    predictedQuality: number;
    predictedWinChance: number;
    reason: string;
  };
}

function avatarFor(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

const scoreLabels: Record<string, string> = {
  creativity: "Creativity", logic: "Logic", humor: "Humor", originality: "Originality",
  comeback: "Comeback", entertainment: "Entertainment", relevance: "Relevance",
  counterarguments: "Counters", consistency: "Consistency", adaptability: "Adaptability",
  confidence: "Confidence", audienceImpact: "Audience", topicAdherence: "Topic fit",
  conversationFlow: "Flow", participation: "Participation", total: "Total",
};

function useCountdown(expiresAt: string | null, active: boolean) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt || !active) { setRemainingMs(null); return; }
    const target = new Date(expiresAt).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, active]);
  if (remainingMs === null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function BattleDetailPage() {
  const params = useParams();
  const battleId = params?.id as string;
  const { user } = useCurrentUser();

  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [messages, setMessages] = useState<BattleMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editRounds, setEditRounds] = useState(3);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);
  const [opponentInsight, setOpponentInsight] = useState<OpponentInsight | null>(null);
  const [joining, setJoining] = useState(false);
  const coachingFetchedRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${battleId}`);
      const data = await res.json();
      if (res.ok) { setBattle(data.battle); setMessages(data.messages ?? []); }
      else { setError(data.error ?? "Battle not found."); }
    } catch { setError("Could not reach the server."); }
    finally { setLoading(false); }
  }, [battleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!battle) return;
    const terminal = ["completed", "cancelled", "expired", "deleted"];
    if (terminal.includes(battle.status)) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [battle, load]);

  useEffect(() => {
    if (!battle || battle.status !== "waiting") return;
    fetch(`/api/battles/${battleId}/insights`)
      .then((res) => (res.ok ? res.json() : { insight: null }))
      .then((data) => setOpponentInsight(data.insight ?? null))
      .catch(() => setOpponentInsight(null));
  }, [battle, battleId]);

  // AI Coach — runs once per (user, battle) after the battle is judged.
  // Never during a live battle: gated on status === "completed". The ref
  // (not just component state) prevents a duplicate call if this effect
  // re-runs from an unrelated re-render or dev-mode double-invoke.
  useEffect(() => {
    if (!battle || !user) return;
    const participant = user.id === battle.creator_id || user.id === battle.opponent_id;
    if (!participant || battle.status !== "completed") return;
    if (coachingFetchedRef.current === battleId) return;
    coachingFetchedRef.current = battleId;

    setCoachingLoading(true);
    setCoachingError(null);
    fetch(`/api/battles/${battleId}/coach`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setCoachingError(data.error ?? "Could not load your AI coaching report."); return; }
        setCoaching(data);
      })
      .catch(() => setCoachingError("Could not reach the server for your AI coaching report."))
      .finally(() => setCoachingLoading(false));
  }, [battle, user, battleId]);

  const countdown = useCountdown(battle?.expires_at ?? null, battle?.status === "waiting");

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true); setError(null); setWarning(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not post message."); setPosting(false); return; }
      if (data.warning) { setWarning(data.warning.message ?? "Keep attacks focused on arguments, not users."); }
      setContent(""); await load();
    } catch { setError("Could not reach the server."); }
    finally { setPosting(false); }
  }

  async function handleJudge() {
    setJudging(true); setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/judge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not judge this battle."); setJudging(false); return; }
      if (res.status === 202) { setError(data.error ?? "The AI judge is still working on this one — try again shortly."); }
      await load();
    } catch { setError("Could not reach the server."); }
    finally { setJudging(false); }
  }

  async function handleCancel() {
    if (!confirm("Cancel this battle? This can't be undone.")) return;
    setActionBusy(true); setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not cancel this battle."); return; }
      await load();
    } catch { setError("Could not reach the server."); }
    finally { setActionBusy(false); }
  }

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not join this battle.");
        return;
      }
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete() {
    setActionBusy(true); setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not delete this battle."); return; }
      setShowDeleteModal(false); await load();
    } catch { setError("Could not reach the server."); }
    finally { setActionBusy(false); }
  }

  function startEditing() {
    if (!battle) return;
    setEditTitle(battle.title); setEditTopic(battle.topic); setEditRounds(battle.rounds); setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault(); setActionBusy(true); setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, topic: editTopic, rounds: editRounds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not save changes."); return; }
      setEditing(false); await load();
    } catch { setError("Could not reach the server."); }
    finally { setActionBusy(false); }
  }

  function copyCode() {
    if (!battle) return;
    navigator.clipboard.writeText(battle.battle_code).then(() => {
      setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500);
    });
  }

  const isOwner = useMemo(() => Boolean(user && battle && user.id === battle.creator_id), [user, battle]);
  const directorReport = useMemo(
    () => (battle ? buildBattleDirectorReport(battle, messages) : null),
    [battle, messages]
  );
  const advancedSystems = directorReport?.advancedSystems ?? null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-aura-purple" />
        <p className="mt-4 text-sm text-white/40">Loading arena…</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <span className="text-5xl">⚔️</span>
        <p className="mt-4 text-white/50 text-lg">{error ?? "Battle not found."}</p>
        <Link href="/battles" className="mt-4 inline-block text-aura-purple font-bold hover:underline">← Back to battles</Link>
      </div>
    );
  }

  const isParticipant = user && (user.id === battle.creator_id || user.id === battle.opponent_id);
  const myMessageCount = user ? messages.filter((m) => m.user_id === user.id).length : 0;
  const canPost = isParticipant && battle.status === "active" && myMessageCount < battle.rounds;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

      {/* Back */}
      <Link href="/battles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/35 transition hover:text-white mb-6">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Arena
      </Link>

      {/* ─── HERO BATTLE HEADER ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e0e] to-[#050505] p-6 mb-5 shadow-[0_0_60px_rgba(255,30,30,0.1)]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-aura-purple/8 blur-[70px]" />
        </div>

        {/* Status bar */}
        <div className="relative flex flex-wrap items-center gap-3 mb-5">
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/55">
            {battle.topic}
          </span>
          {battle.status === "active" && (
            <span className="flex items-center gap-1.5 rounded-full bg-aura-purple/18 border border-aura-purple/35 px-3 py-1 text-xs font-black uppercase tracking-wider text-aura-purple shadow-[0_0_12px_rgba(255,30,30,0.35)]">
              <span className="h-1.5 w-1.5 rounded-full bg-aura-purple animate-pulseGlow" /> LIVE
            </span>
          )}
          {battle.status === "completed" && (
            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">🏆 Completed</span>
          )}
          {battle.status === "waiting" && (
            <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/45">Open</span>
          )}
          {battle.status === "judging" && (
            <span className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/70 animate-pulseGlow">🤖 AI Judging…</span>
          )}
          {(battle.status === "deleted" || battle.status === "cancelled" || battle.status === "expired") && (
            <span className="rounded-full border border-aura-purple/30 bg-aura-purple/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-aura-purple/80 capitalize">{battle.status}</span>
          )}

          <button onClick={copyCode} className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/50 hover:border-aura-purple/50 hover:text-white transition-all">
            #{battle.battle_code}
            <span className="text-[10px]">{codeCopied ? "✓" : "copy"}</span>
          </button>

          {countdown && (
            <span className={`text-xs font-semibold ${countdown.startsWith("0:") ? "text-aura-purple" : "text-white/35"}`}>
              Expires in {countdown}
            </span>
          )}
        </div>

        <h1 className="relative font-display text-2xl font-black leading-tight sm:text-3xl mb-5">{battle.title}</h1>

        {/* Players row */}
        <div className="relative grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          {/* Creator */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username}
                className="h-12 w-12 rounded-xl border-2 border-aura-purple/60 shadow-[0_0_24px_rgba(255,30,30,0.4)]" />
              {battle.winner_id === battle.creator_id && (
                <span className="absolute -top-2 -right-2 text-base">🏆</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-black">{battle.creator_username}</p>
              <p className="text-xs text-white/35">Challenger</p>
            </div>
          </div>

          {/* VS */}
          <div className="flex h-10 w-10 items-center justify-center justify-self-center rounded-full border border-aura-purple/40 bg-black/60 shadow-[0_0_20px_rgba(255,30,30,0.35)]">
            <span className="font-display text-xs font-black text-gradient-rage">VS</span>
          </div>

          {/* Opponent */}
          {battle.opponent_username ? (
            <div className="flex items-center gap-3 text-left sm:justify-end sm:text-right">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-black">{battle.opponent_username}</p>
                <p className="text-xs text-white/35">Defender</p>
              </div>
              <div className="relative shrink-0">
                <img src={avatarFor(battle.opponent_username, battle.opponent_avatar)} alt={battle.opponent_username}
                  className="h-12 w-12 rounded-xl border-2 border-white/35 shadow-[0_0_20px_rgba(255,255,255,0.12)]" />
                {battle.winner_id === battle.opponent_id && (
                  <span className="absolute -top-2 -left-2 text-base">🏆</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex sm:justify-end">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-xl text-white/20">?</div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm font-semibold text-aura-purple">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start">
        <div className="min-w-0">

      {/* Owner actions */}
      {isOwner && battle.status === "waiting" && !editing && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={startEditing} disabled={actionBusy}>✏️ Edit</Button>
          <Button variant="danger" size="sm" onClick={handleCancel} disabled={actionBusy}>Cancel Battle</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)} disabled={actionBusy}>Delete</Button>
        </div>
      )}
      {isOwner && !["waiting", "deleted"].includes(battle.status) && (
        <div className="mb-4">
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)} disabled={actionBusy}>Delete Battle</Button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="mb-5 card-surface rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-base font-black">Edit Battle</h3>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Battle title" maxLength={140}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-aura-purple/60 transition" />
            <input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} placeholder="Topic" maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-aura-purple/60 transition" />
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-white/45 uppercase tracking-wide">Rounds</label>
              <input type="number" min={1} max={5} value={editRounds} onChange={(e) => setEditRounds(Number(e.target.value))}
                className="w-20 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-aura-purple/60 transition" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={actionBusy}>{actionBusy ? "Saving…" : "Save Changes"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={actionBusy}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Deleted notice */}
      {battle.status === "deleted" && (
        <div className="mb-5 rounded-2xl border border-aura-purple/30 bg-aura-purple/8 px-5 py-4 text-center">
          <p className="font-display font-black text-aura-purple">Battle Removed</p>
          <p className="mt-1 text-sm text-white/50">Removed by creator — history preserved below.</p>
        </div>
      )}

      {/* AI verdict */}
      {battle.status === "completed" && battle.ai_summary && (
        <div className="mb-5 card-surface rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🤖</span>
            <h2 className="font-display text-lg font-black">AI Judge Verdict</h2>
          </div>
          <p className="text-sm text-white/65 leading-relaxed italic">&ldquo;{battle.ai_summary}&rdquo;</p>

          {battle.ai_scores && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["creator", "opponent"] as const).map((side) => {
                const scores = battle.ai_scores?.[side];
                const name = side === "creator" ? battle.creator_username : battle.opponent_username;
                const feedback = battle.ai_scores?.feedback?.[side];
                if (!scores) return null;
                const isWinner = battle.winner_id === (side === "creator" ? battle.creator_id : battle.opponent_id);
                return (
                  <div key={side} className={`rounded-xl border p-4 ${isWinner ? "border-aura-purple/35 bg-aura-purple/8 shadow-[0_0_20px_rgba(255,30,30,0.15)]" : "border-white/8 bg-white/[0.02]"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="font-display font-black text-sm">{name}</p>
                      {isWinner && <span className="text-sm">🏆</span>}
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(scores)
                        .filter(([key]) => key !== "total")
                        .map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-white/45">{scoreLabels[key] ?? key}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 rounded-full bg-white/8 overflow-hidden">
                              <div className={`h-full rounded-full ${isWinner ? "bg-aura-purple shadow-[0_0_6px_rgba(255,30,30,0.7)]" : "bg-white/40"}`} style={{ width: `${Math.min(100, value)}%` }} />
                            </div>
                            <span className={`font-mono text-xs font-bold ${isWinner ? "text-aura-purple" : "text-white/60"}`}>{value}</span>
                          </div>
                        </div>
                      ))}
                      {typeof scores.total === "number" && (
                        <div className="flex items-center justify-between border-t border-white/8 pt-1.5 mt-1.5">
                          <span className="text-xs font-semibold text-white/60">Total</span>
                          <span className={`font-mono text-xs font-bold ${isWinner ? "text-aura-purple" : "text-white/60"}`}>{scores.total}</span>
                        </div>
                      )}
                    </div>
                    {feedback && <p className="mt-3 text-xs italic text-white/40 leading-relaxed">{feedback}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {directorReport && directorReport.explainableScores.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <h3 className="font-display text-sm font-black text-white/80">Explainable Judging</h3>
              <div className="mt-3 space-y-3">
                {directorReport.explainableScores.map((entry) => (
                  <div key={entry.metric} className="border-t border-white/8 pt-3 first:border-t-0 first:pt-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wider text-white/55">{entry.label}</p>
                      <p className="font-mono text-xs text-white/45">
                        {entry.creatorScore} / {entry.opponentScore}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p className="text-xs leading-relaxed text-white/55">
                        <span className="font-semibold text-aura-purple">{battle.creator_username}:</span>{" "}
                        {entry.creatorExplanation}
                      </p>
                      <p className="text-xs leading-relaxed text-white/55">
                        <span className="font-semibold text-white/80">{battle.opponent_username ?? "Opponent"}:</span>{" "}
                        {entry.opponentExplanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {advancedSystems && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-sm font-black text-white/80">Advanced AI Systems</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-white/40">
                  {advancedSystems.version}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">Memory Engine V2</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{advancedSystems.memoryV2.summary}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">Battle Health</p>
                  <p className="mt-1 font-mono text-lg font-black text-emerald-200">{advancedSystems.health.healthyDebate}%</p>
                  <p className="text-xs text-white/45">{advancedSystems.health.label}</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">Self Evaluation</p>
                  <p className="mt-1 font-mono text-lg font-black text-white/75">{advancedSystems.selfEvaluation.confidence}%</p>
                  <p className="text-xs text-white/45">
                    {advancedSystems.selfEvaluation.needsHumanReview ? "Human review recommended" : "Automated verdict confidence acceptable"}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["creator", "opponent"] as const).map((side) => {
                  const name = side === "creator" ? battle.creator_username : battle.opponent_username ?? "Opponent";
                  const dna = advancedSystems.debateDna[side];
                  const rep = advancedSystems.reputation[side];
                  return (
                    <div key={side} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black text-white/75">{name}</p>
                        <span className="font-mono text-xs text-white/45">{rep.hiddenRating}% rep</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-white/45">
                        <p>Logic <span className="font-mono text-white/70">{dna.logical}%</span></p>
                        <p>Funny <span className="font-mono text-white/70">{dna.funny}%</span></p>
                        <p>Energy <span className="font-mono text-white/70">{dna.aggressive}%</span></p>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-white/45">{rep.label}</p>
                    </div>
                  );
                })}
              </div>

              {advancedSystems.timeline.length > 0 && (
                <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">Debate Timeline</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {advancedSystems.timeline.slice(0, 6).map((event) => (
                      <p key={`${event.at}-${event.label}`} className="text-xs text-white/50">
                        <span className="font-mono text-white/35">{event.at}</span>{" "}
                        <span className="font-semibold text-white/65">{event.label}:</span> {event.detail}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {battle.ai_scores?.battleAnalysis && (
            <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
              <h3 className="font-display text-sm font-black text-white/80">Battle Analysis</h3>
              {battle.ai_scores.battleAnalysis.finalSummary && (
                <p className="text-sm text-white/60 leading-relaxed">{battle.ai_scores.battleAnalysis.finalSummary}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {battle.ai_scores.battleAnalysis.strongestArgument && (
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/70">💪 Strongest Argument</p>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">{battle.ai_scores.battleAnalysis.strongestArgument}</p>
                  </div>
                )}
                {battle.ai_scores.battleAnalysis.bestComeback && (
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/70">🔥 Best Comeback</p>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">{battle.ai_scores.battleAnalysis.bestComeback}</p>
                  </div>
                )}
                {battle.ai_scores.battleAnalysis.turningPoint && (
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/70">⚡ Turning Point</p>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">{battle.ai_scores.battleAnalysis.turningPoint}</p>
                  </div>
                )}
                {battle.ai_scores.battleAnalysis.weakestArgument && (
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/70">📉 Weakest Argument</p>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">{battle.ai_scores.battleAnalysis.weakestArgument}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Coach — Your Performance (Phase 3). Own section, own data
          fetch (see the coaching useEffect above) — reads the Judge's
          already-saved verdict rather than re-scoring anything, and never
          renders for anyone but a participant of a completed battle. */}
      {battle.status === "completed" && isParticipant && (
        <div className="mb-5 card-surface rounded-2xl p-6">
          <h3 className="font-display text-lg font-black flex items-center gap-2">🎯 Your Performance</h3>

          {coachingLoading && (
            <p className="mt-3 text-sm text-white/40">Your AI Coach is reviewing this battle…</p>
          )}
          {coachingError && !coachingLoading && (
            <p className="mt-3 text-sm text-aura-purple">{coachingError}</p>
          )}

          {coaching && !coachingLoading && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-white/70 leading-relaxed italic">{coaching.coachFeedback}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-aura-green">💪 Strengths</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-white/60">
                    {coaching.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-aura-purple">📈 Areas to Improve</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-white/60">
                    {coaching.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              </div>

              {coaching.repeatedMistakes.length > 0 && (
                <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-white/70">🔁 Repeated Patterns</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-white/50">
                    {coaching.repeatedMistakes.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <p className="text-xs font-semibold text-white/70">💡 Improvement Tips</p>
                <ul className="mt-1.5 space-y-1 text-xs text-white/50">
                  {coaching.improvementSuggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>

              <div className="rounded-lg border border-aura-purple/30 bg-aura-purple/5 p-3">
                <p className="text-xs font-semibold text-aura-purple">🎯 Next Goal</p>
                <p className="mt-1 text-xs text-white/70">{coaching.practiceGoal}</p>
              </div>

              {coaching.progression && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-white/70">📊 Progress Since Last Battle</p>
                  <div className="space-y-1.5">
                    {coaching.progression.map((p) => {
                      const delta = Math.round((p.to - p.from) * 10) / 10;
                      return (
                        <div key={p.metric} className="flex items-center justify-between text-xs">
                          <span className="text-white/45">{scoreLabels[p.metric] ?? p.metric}</span>
                          <span className="font-mono">
                            <span className="text-white/40">{p.from.toFixed(1)}</span>
                            <span className="mx-1 text-white/25">→</span>
                            <span className={delta > 0 ? "font-bold text-aura-green" : delta < 0 ? "font-bold text-aura-purple" : "text-white/50"}>
                              {p.to.toFixed(1)}
                            </span>
                            {delta !== 0 && (
                              <span className={`ml-1 ${delta > 0 ? "text-aura-green" : "text-aura-purple"}`}>
                                ({delta > 0 ? "+" : ""}{delta})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3 text-xs text-white/40">
                <span>Playstyle: <span className="font-semibold text-white/70">{coaching.playstyle}</span></span>
                <span>·</span>
                <span>{coaching.profile.totalReviews} battle{coaching.profile.totalReviews === 1 ? "" : "s"} reviewed by your AI Coach</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Judging prompt */}
      {(battle.status === "judging" || battle.status === "pending_review") && isParticipant && (
        <div className="mb-5 card-surface rounded-2xl p-6 text-center">
          <span className="text-4xl">🤖</span>
          <p className="mt-3 font-display text-lg font-black">
            {battle.status === "pending_review" ? "Judge Hiccuped — Retry" : "Ready to Judge"}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {battle.status === "pending_review"
              ? "The AI judge couldn't reach a verdict last time. Give it another shot."
              : "Both players are done. Run the AI to decide the winner."}
          </p>
          <Button className="mt-4" onClick={handleJudge} disabled={judging}>
            {judging ? "Judging…" : "⚡ Run AI Judge"}
          </Button>
        </div>
      )}
      {(battle.status === "judging" || battle.status === "pending_review") && !isParticipant && (
        <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-center text-sm text-white/40">
          Awaiting AI judging…
        </div>
      )}

      {/* Waiting for opponent */}
      {battle.status === "waiting" && (
        <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="text-center">
            <p className="text-sm text-white/40">Waiting for an opponent to join this battle.</p>
            {countdown && <p className="mt-1 text-xs text-white/25">Expires in {countdown}</p>}
          </div>

          {opponentInsight && (
            <div className="mt-4 rounded-xl border border-aura-purple/20 bg-aura-purple/[0.06] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-aura-purple">Opponent Insight</p>
                {opponentInsight.compatibility && (
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-white/60">
                    {opponentInsight.compatibility.score}% match · {opponentInsight.compatibility.difficulty}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white/60">{opponentInsight.summary}</p>
              <div className="mt-3 grid gap-3 text-xs text-white/50 sm:grid-cols-3">
                <p>Style: <span className="font-semibold text-white/75">{opponentInsight.opponentStyle}</span></p>
                <p>Strong: <span className="text-white/70">{opponentInsight.strengths.slice(0, 2).join(", ")}</span></p>
                <p>Weak: <span className="text-white/70">{opponentInsight.weaknesses.slice(0, 2).join(", ")}</span></p>
              </div>
              {opponentInsight.compatibility && (
                <p className="mt-3 text-xs text-white/45">{opponentInsight.compatibility.reason}</p>
              )}
            </div>
          )}

          {user && user.id !== battle.creator_id && (
            <Button className="mt-4 w-full" onClick={handleJoin} disabled={joining}>
              {joining ? "Joining..." : "Join Battle"}
            </Button>
          )}
        </div>
      )}

      {/* ─── MESSAGES / ROAST FEED ─── */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-white/[0.02] py-10 text-center">
            <span className="text-3xl">🎤</span>
            <p className="mt-2 text-sm text-white/30">No roasts posted yet — drop the first fire line.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCreator = msg.user_id === battle.creator_id;
            return (
              <div key={msg.id} className={`flex gap-3 ${isCreator ? "" : "flex-row-reverse"}`}>
                <img src={avatarFor(msg.username, msg.avatar_url)} alt={msg.username}
                  className={`h-9 w-9 flex-shrink-0 rounded-xl border ${isCreator ? "border-aura-purple/45" : "border-white/25"}`} />
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  isCreator
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/8"
                    : "bg-aura-gradient shadow-[0_0_20px_rgba(255,30,30,0.3)]"
                }`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isCreator ? "text-white/35" : "text-white/70"}`}>
                    {msg.username} · Round {msg.round}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {canPost && (
        <form onSubmit={handlePost} className="mt-5 flex gap-3">
          <div className="flex-1 relative">
            {warning && (
              <div className="mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
                ⚠️ {warning}
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Drop roast #${myMessageCount + 1} of ${battle.rounds}…`}
              maxLength={1000}
              rows={2}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-aura-purple/60 focus:shadow-glow-sm backdrop-blur-md transition-all"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(e as unknown as React.FormEvent); } }}
            />
          </div>
          <Button type="submit" size="md" disabled={posting} className="self-end shrink-0">
            {posting ? "Posting…" : "🔥 Fire"}
          </Button>
        </form>
      )}

      {isParticipant && battle.status === "active" && !canPost && myMessageCount >= battle.rounds && (
        <p className="mt-5 text-center text-sm text-white/35">
          You&apos;ve posted all {battle.rounds} roasts. Waiting for your opponent…
        </p>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <span className="text-4xl">🗑️</span>
            <h2 className="mt-3 font-display text-xl font-black">Delete this battle?</h2>
            <p className="mt-2 text-sm text-white/50">Removes it from public view — history is preserved.</p>
            {error && <p className="mt-3 text-sm text-aura-purple font-semibold">{error}</p>}
            <div className="mt-5 flex justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)} disabled={actionBusy}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={actionBusy}>
                {actionBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>

        <div className="space-y-5">
          {directorReport && <BattleDirectorPanel battle={battle} messages={messages} report={directorReport} />}
          <BattleCompanion battle={battle} messages={messages} user={user} draft={content} />
        </div>
      </div>
    </div>
  );
}
