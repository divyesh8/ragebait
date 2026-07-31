"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuraBadge from "@/components/ui/AuraBadge";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  aura: number;
  wins: number;
  losses: number;
  winRate: number;
}

function avatarFor(u: string, url: string | null | undefined) {
  return url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(u)}`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-aura-purple mb-2">🏆 Rankings</p>
        <h1 className="font-display text-5xl font-black tracking-tight">
          <span className="text-gradient-rage">Champions</span>
        </h1>
        <p className="mt-3 text-sm text-white/40">The top rage warriors, ranked by Aura earned in battle.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />)}
        </div>
      ) : (
        <>
          {/* ─── TOP 3 PODIUM ─── */}
          {top3.length > 0 && (
            <div className="mb-8 grid grid-cols-3 items-end gap-3">
              {/* 2nd */}
              {top3[1] && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 pb-5">
                  <span className="text-2xl">🥈</span>
                  <img src={avatarFor(top3[1].username, top3[1].avatarUrl)} alt={top3[1].username} className="h-14 w-14 rounded-2xl border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.12)]" />
                  <div className="text-center">
                    <Link href={`/profile/${top3[1].userId}`} className="font-display text-sm font-black truncate max-w-[80px] hover:text-aura-purple">
                      {top3[1].username}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] text-white/35">{top3[1].userId}</p>
                    <AuraBadge value={top3[1].aura} size="xs" />
                  </div>
                  <div className="text-center text-[11px] text-white/35">
                    {top3[1].wins}W · {top3[1].winRate}% WR
                  </div>
                </div>
              )}

              {/* 1st — taller */}
              {top3[0] && (
                <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-aura-purple/40 bg-aura-purple/8 p-4 pb-6 shadow-[0_0_40px_rgba(255,30,30,0.2)]">
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(255,30,30,0.15),transparent_65%)]" />
                  <span className="text-3xl">🥇</span>
                  <img src={avatarFor(top3[0].username, top3[0].avatarUrl)} alt={top3[0].username} className="h-20 w-20 rounded-2xl border-2 border-aura-purple/70 shadow-[0_0_40px_rgba(255,30,30,0.5)] animate-rageGlow" />
                  <div className="text-center">
                    <Link href={`/profile/${top3[0].userId}`} className="font-display text-base font-black hover:text-aura-purple">
                      {top3[0].username}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] text-white/40">{top3[0].userId}</p>
                    <AuraBadge value={top3[0].aura} size="sm" />
                  </div>
                  <div className="text-center text-xs text-white/50 font-semibold">
                    {top3[0].wins}W · {top3[0].winRate}% WR
                  </div>
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-aura-gradient px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-glow-sm">
                    #1 Champion
                  </span>
                </div>
              )}

              {/* 3rd */}
              {top3[2] && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 pb-5">
                  <span className="text-2xl">🥉</span>
                  <img src={avatarFor(top3[2].username, top3[2].avatarUrl)} alt={top3[2].username} className="h-14 w-14 rounded-2xl border-2 border-white/20 shadow-[0_0_16px_rgba(255,255,255,0.08)]" />
                  <div className="text-center">
                    <Link href={`/profile/${top3[2].userId}`} className="font-display text-sm font-black truncate max-w-[80px] hover:text-aura-purple">
                      {top3[2].username}
                    </Link>
                    <p className="mt-0.5 font-mono text-[10px] text-white/35">{top3[2].userId}</p>
                    <AuraBadge value={top3[2].aura} size="xs" />
                  </div>
                  <div className="text-center text-[11px] text-white/35">
                    {top3[2].wins}W · {top3[2].winRate}% WR
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── FULL LIST ─── */}
          <div className="card-surface rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_auto_auto_auto] gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white/25 border-b border-white/6">
              <span>#</span>
              <span>Fighter</span>
              <span className="hidden sm:block">Wins</span>
              <span className="hidden sm:block">Win Rate</span>
              <span>Aura</span>
            </div>

            <div className="divide-y divide-white/5">
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-[40px_1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 transition-all hover:bg-white/[0.03] ${entry.rank <= 3 ? "hover:bg-aura-purple/5" : ""}`}
                >
                  <span className={`font-display text-sm font-black text-center ${
                    entry.rank === 1 ? "text-aura-purple drop-shadow-[0_0_8px_rgba(255,30,30,0.9)]" :
                    entry.rank === 2 ? "text-white/70" :
                    entry.rank === 3 ? "text-white/50" :
                    "text-white/25"
                  }`}>
                    {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                  </span>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.username} className={`h-9 w-9 rounded-xl border shrink-0 ${entry.rank === 1 ? "border-aura-purple/50 shadow-[0_0_12px_rgba(255,30,30,0.4)]" : "border-white/10"}`} />
                    <Link href={`/profile/${entry.userId}`} className="min-w-0 hover:text-aura-purple">
                      <span className="block truncate font-display text-sm font-bold">{entry.username}</span>
                      <span className="block font-mono text-[10px] text-white/30">{entry.userId}</span>
                    </Link>
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-white/60">{entry.wins}</span>
                  <span className="hidden sm:block text-sm font-semibold text-white/60">{entry.winRate}%</span>
                  <AuraBadge value={entry.aura} size="xs" />
                </div>
              ))}

              {entries.length === 0 && (
                <div className="py-16 text-center text-sm text-white/35">No fighters yet — be the first.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
