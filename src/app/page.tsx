"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface RecommendedBattle {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: string;
  creator_id: string;
  creator_username: string;
  creator_avatar: string;
  creator_aura: number;
  opponent_username: string | null;
  opponent_avatar: string | null;
  matchScore: number;
  recommendationReason: string;
  recommendationType: string;
}

interface MatchRecommendation {
  opponent: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    aura: number;
    winRate: number;
    preferredStyle: string;
    favoriteTopics: string[];
    lastActiveAt: string | null;
  };
  compatibilityScore: number;
  difficultyRating: string;
  predictedBattleQuality: number;
  predictedWinChance: number;
  reason: string;
}

interface FeedSection<T> {
  id: string;
  title: string;
  items: T[];
}

interface PersonalizedFeed {
  generatedAt: string;
  cache: "hit" | "miss" | "fallback";
  sections: {
    recommendedForYou: FeedSection<RecommendedBattle>;
    trendingNow: FeedSection<RecommendedBattle>;
    newBattles: FeedSection<RecommendedBattle>;
    matchingInterests: FeedSection<RecommendedBattle>;
    improveWeaknesses: FeedSection<RecommendedBattle>;
    playersToChallenge: FeedSection<MatchRecommendation>;
    similarPlayers: FeedSection<MatchRecommendation>;
    recentlyActiveOpponents: FeedSection<MatchRecommendation>;
    discovery: FeedSection<RecommendedBattle>;
  };
  trends: {
    topics: { topic: string; score: number; growthLabel: string }[];
  };
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  aura: number;
  wins: number;
  winRate: number;
}

function avatarFor(username: string, avatarUrl: string | null | undefined) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

function battleLink(battle: RecommendedBattle) {
  return battle.id.startsWith("topic:") ? "/battles" : `/battles/${battle.id}`;
}

const RANK_BADGES = ["1", "2", "3", "4", "5"];

export default function HomePage() {
  const { user } = useCurrentUser();
  const [feed, setFeed] = useState<PersonalizedFeed | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("recommendedForYou");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/recommendations/feed").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => (r.ok ? r.json() : { leaderboard: [] })),
    ])
      .then(([feedData, leaderboardData]) => {
        if (cancelled) return;
        setFeed(feedData.feed ?? null);
        setLeaderboard(leaderboardData.leaderboard ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setFeed(null);
          setLeaderboard([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const battleSections = useMemo(
    () =>
      feed
        ? [
            feed.sections.recommendedForYou,
            feed.sections.trendingNow,
            feed.sections.newBattles,
            feed.sections.matchingInterests,
            feed.sections.improveWeaknesses,
            feed.sections.discovery,
          ].filter((section) => section.items.length > 0)
        : [],
    [feed]
  );

  const selectedSection =
    battleSections.find((section) => section.id === activeSection || section.title === activeSection) ??
    battleSections[0] ??
    null;

  const heroBattle = feed?.sections.recommendedForYou.items[0] ?? feed?.sections.trendingNow.items[0] ?? null;
  const topLeaders = leaderboard.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <main className="min-w-0 space-y-5">
          {loading ? (
            <div className="h-[420px] animate-pulse rounded-3xl bg-white/[0.04]" />
          ) : heroBattle ? (
            <HeroBattle battle={heroBattle} />
          ) : (
            <div className="card-surface rounded-3xl py-20 text-center">
              <p className="font-display text-2xl font-black">No battles yet</p>
              <Link href="/battles" className="mt-5 inline-block">
                <Button>Start a Battle</Button>
              </Link>
            </div>
          )}

          {battleSections.length > 0 && (
            <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03] p-1 backdrop-blur-md">
              {battleSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                    selectedSection?.id === section.id
                      ? "bg-aura-gradient text-white shadow-glow-sm"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}

          {selectedSection && <BattleSection section={selectedSection} />}
        </main>

        <aside className="space-y-5">
          {user ? (
            <div className="card-surface rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <img
                  src={avatarFor(user.username, user.avatar_url)}
                  alt={user.username}
                  className="h-14 w-14 rounded-2xl border-2 border-aura-purple/60 shadow-[0_0_24px_rgba(255,30,30,0.35)]"
                />
                <div>
                  <p className="font-display text-lg font-black">{user.username}</p>
                  <AuraBadge value={user.aura} size="xs" trend="neutral" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <StatBox value={user.wins + user.losses} label="Battles" />
                <StatBox value={user.wins} label="Wins" />
                <StatBox
                  value={`${user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0}%`}
                  label="Win Rate"
                />
              </div>
            </div>
          ) : (
            <div className="card-surface rounded-2xl p-6 text-center">
              <p className="font-display text-lg font-black">Enter the Arena</p>
              <Link href="/signup" className="mt-5 block">
                <Button className="w-full">Join Ragebait</Button>
              </Link>
              <Link href="/login" className="mt-3 block text-sm text-white/40 hover:text-white">
                Log in
              </Link>
            </div>
          )}

          {feed && <OpponentSection section={feed.sections.playersToChallenge} />}
          {feed && <OpponentSection section={feed.sections.similarPlayers} compact />}
          {feed && <TrendPanel topics={feed.trends.topics.slice(0, 6)} />}

          <div className="card-surface rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-black">Top Fighters</h2>
              <Link href="/leaderboard" className="text-xs font-bold text-aura-purple hover:text-white">
                View
              </Link>
            </div>
            {topLeaders.length === 0 ? (
              <p className="text-sm text-white/35">No fighters yet.</p>
            ) : (
              <div className="space-y-2">
                {topLeaders.map((entry, index) => (
                  <div key={entry.username} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                    <span className="w-5 text-center font-display text-xs font-black text-white/45">{RANK_BADGES[index]}</span>
                    <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.username} className="h-8 w-8 rounded-lg border border-white/10" />
                    <span className="flex-1 truncate text-sm font-bold">{entry.username}</span>
                    <AuraBadge value={entry.aura} size="xs" trend="neutral" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function HeroBattle({ battle }: { battle: RecommendedBattle }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#101010] to-[#050505] p-6 shadow-[0_0_80px_rgba(255,30,30,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/55">
          {battle.topic}
        </span>
        <span className="rounded-full border border-aura-purple/35 bg-aura-purple/12 px-3 py-1 text-xs font-black uppercase tracking-wider text-aura-purple">
          {battle.matchScore}% match
        </span>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_220px] md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/35">{battle.battle_type} / {battle.mode}</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-none sm:text-5xl">{battle.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">{battle.recommendationReason}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-12 w-12 rounded-xl border border-aura-purple/45" />
            <div>
              <p className="font-display text-base font-black">{battle.creator_username}</p>
              <AuraBadge value={battle.creator_aura} size="xs" trend="neutral" />
            </div>
          </div>
          <Link href={battleLink(battle)} className="mt-4 block">
            <Button className="w-full" size="sm">{battle.status === "waiting" ? "Join Battle" : "Open Battle"}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function BattleSection({ section }: { section: FeedSection<RecommendedBattle> }) {
  return (
    <section className="space-y-3">
      {section.items.map((battle) => (
        <Link key={battle.id} href={battleLink(battle)} className="card-surface group flex flex-col gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-white/18 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-4 min-w-0">
            <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-12 w-12 rounded-xl border border-white/12 group-hover:border-aura-purple/40" />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{battle.topic}</span>
                <span className="rounded-full border border-aura-purple/25 bg-aura-purple/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-aura-purple">{battle.matchScore}%</span>
              </div>
              <p className="truncate font-display text-base font-black">{battle.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-white/42">{battle.recommendationReason}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0">{battle.status === "waiting" ? "Join" : "View"}</Button>
        </Link>
      ))}
    </section>
  );
}

function OpponentSection({ section, compact = false }: { section: FeedSection<MatchRecommendation>; compact?: boolean }) {
  if (section.items.length === 0) return null;
  return (
    <div className="card-surface rounded-2xl p-5">
      <h2 className="mb-4 font-display text-base font-black">{section.title}</h2>
      <div className="space-y-3">
        {section.items.slice(0, compact ? 3 : 5).map((match) => (
          <div key={match.opponent.userId} className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <div className="flex items-center gap-3">
              <img src={avatarFor(match.opponent.username, match.opponent.avatarUrl)} alt={match.opponent.username} className="h-9 w-9 rounded-lg border border-white/10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{match.opponent.username}</p>
                <p className="text-[11px] text-white/35">{match.difficultyRating} / {match.compatibilityScore}% compatible</p>
              </div>
              <AuraBadge value={match.opponent.aura} size="xs" trend="neutral" />
            </div>
            {!compact && <p className="mt-2 text-xs leading-relaxed text-white/45">{match.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendPanel({ topics }: { topics: { topic: string; score: number; growthLabel: string }[] }) {
  if (topics.length === 0) return null;
  return (
    <div className="card-surface rounded-2xl p-5">
      <h2 className="mb-4 font-display text-base font-black">Trending Topics</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link key={topic.topic} href="/battles" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/55 hover:border-aura-purple/45 hover:text-white">
            {topic.topic} · {topic.growthLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] py-3">
      <p className="font-display text-xl font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

