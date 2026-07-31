"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuraBadge from "@/components/ui/AuraBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Gender } from "@/lib/gender";
import { PUBLIC_USER_MENTION_PATTERN } from "@/lib/userIds";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface PublicProfile {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  avatarUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  showGenderOnPublicProfile: boolean;
  country: string;
  languages: string[];
  favoriteBattleCategory: string;
  profileVisibility: "public" | "partners" | "private";
  status: string;
  lastActive: string | null;
  currentActivity: string;
  rank: string;
  aura: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  averageAiScore: number;
  averageBattleLength: number;
  mostUsedBattleCategory: string;
  favoriteLanguage: string;
  totalAuraEarned: number;
  totalAuraLost: number;
  highestRankAchieved: string;
  totalBattles: number;
  createdAt: string;
  canViewFull: boolean;
}

interface ProfileSocial {
  isSelf: boolean;
  relationship: "self" | "partner" | "incoming_request" | "outgoing_request" | "blocked" | "none";
  pendingRequestId: string | null;
  mutualPartners: number;
}

interface ProfileBattle {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: string;
  winner_id: string | null;
  created_at: string;
  creator_id: string;
  creatorUserId: string;
  creator_username: string;
  opponent_id: string | null;
  opponentUserId: string | null;
  opponent_username: string | null;
}

function avatarFor(username: string, avatarUrl: string | null | undefined) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

function renderMentions(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(new RegExp(PUBLIC_USER_MENTION_PATTERN))) {
    const start = match.index ?? 0;
    const id = match[1];
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <Link key={`${id}-${start}`} href={`/profile/${id}`} className="font-mono text-aura-purple hover:underline">
        @{id}
      </Link>
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function ProfilePartnerAction({
  social,
  busy,
  onAction,
}: {
  social: ProfileSocial;
  busy: boolean;
  onAction: (action: "send" | "accept" | "reject" | "cancel" | "remove") => void;
}) {
  if (social.relationship === "partner") {
    return <Button size="sm" variant="danger" disabled={busy} onClick={() => onAction("remove")}>{busy ? "Removing..." : "Remove Partner"}</Button>;
  }
  if (social.relationship === "incoming_request") {
    return (
      <>
        <Button size="sm" disabled={busy} onClick={() => onAction("accept")}>{busy ? "Accepting..." : "Accept Request"}</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction("reject")}>Reject</Button>
      </>
    );
  }
  if (social.relationship === "outgoing_request") {
    return <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction("cancel")}>{busy ? "Cancelling..." : "Cancel Request"}</Button>;
  }
  if (social.relationship === "blocked") {
    return <Button size="sm" variant="ghost" disabled>Unavailable</Button>;
  }
  return <Button size="sm" disabled={busy} onClick={() => onAction("send")}>{busy ? "Sending..." : "Send Partner Request"}</Button>;
}

export default function PublicProfilePage() {
  const params = useParams();
  const identity = params?.username as string;
  const { user: currentUser } = useCurrentUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [social, setSocial] = useState<ProfileSocial | null>(null);
  const [battles, setBattles] = useState<ProfileBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/profile/${encodeURIComponent(identity)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Profile not found.");
          setProfile(null);
          setBattles([]);
          return;
        }
        setProfile(data.profile);
        setSocial(data.social ?? null);
        setBattles(data.battles ?? []);
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, [identity]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const avatarUrl = useMemo(
    () => (profile ? avatarFor(profile.username, profile.avatarUrl ?? profile.avatar) : ""),
    [profile]
  );

  async function copyUserId() {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendPartnerAction(action: "send" | "accept" | "reject" | "cancel" | "remove") {
    if (!profile || !social) return;
    setActionBusy(true);
    setActionMessage(null);
    try {
      let res: Response;
      if (action === "send") {
        res = await fetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ targetUserId: profile.id }),
        });
      } else if (action === "remove") {
        res = await fetch(`/api/partners/${profile.id}`, { method: "DELETE", credentials: "include" });
      } else {
        if (!social.pendingRequestId) return;
        res = await fetch(`/api/partners/requests/${social.pendingRequestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        });
      }
      const data = await res.json();
      setActionMessage(res.ok ? "Partner action updated." : data.error ?? "Could not update partner status.");
      await loadProfile();
    } finally {
      setActionBusy(false);
      setTimeout(() => setActionMessage(null), 2400);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-56 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-sm text-white/45">{error ?? "That user does not exist."}</p>
        <Link href="/leaderboard" className="mt-6 inline-block">
          <Button size="md" variant="secondary">Browse leaderboard</Button>
        </Link>
      </div>
    );
  }

  const statItems = [
    { label: "Battles", value: profile.totalBattles },
    { label: "Wins", value: profile.wins },
    { label: "Losses", value: profile.losses },
    { label: "Draws", value: profile.draws },
    { label: "Win Rate", value: `${profile.winRate}%` },
    { label: "Avg AI Score", value: profile.averageAiScore },
    { label: "Avg Length", value: profile.averageBattleLength },
    { label: "Longest Streak", value: profile.bestStreak },
    { label: "Current Streak", value: profile.currentStreak },
    { label: "Main Category", value: profile.mostUsedBattleCategory },
    { label: "Favorite Language", value: profile.favoriteLanguage },
    { label: "Aura Earned", value: profile.totalAuraEarned.toLocaleString() },
    { label: "Aura Lost", value: profile.totalAuraLost.toLocaleString() },
    { label: "Highest Rank", value: profile.highestRankAchieved },
    { label: "Level", value: profile.level },
    { label: "XP", value: profile.xp.toLocaleString() },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="relative h-40 overflow-hidden rounded-[2rem] border border-white/10 bg-aura-gradient sm:h-56">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.2),transparent_45%,rgba(255,255,255,0.16))]" />
        <div className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-wider text-white/65 backdrop-blur-xl">
          {profile.rank}
        </div>
      </div>

      <div className="relative -mt-12 flex flex-col gap-5 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <img
            src={avatarUrl}
            alt={profile.username}
            className="h-24 w-24 rounded-2xl border-4 border-void bg-white/[0.04] sm:h-28 sm:w-28"
          />

          <div className="pb-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{profile.username}</h1>
            <p className="text-sm text-white/40">
              ID {profile.userId} / {profile.country} / Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-bold text-white/55">{profile.status}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-bold text-white/55">{profile.favoriteBattleCategory}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-bold text-white/55">{profile.languages.join(", ")}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-white/35">ID</p>
            <p className="font-mono text-sm font-bold text-white">{profile.userId}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={copyUserId}>
            {copied ? "Copied!" : "Copy"}
          </Button>
          {social && !social.isSelf && currentUser && (
            <ProfilePartnerAction social={social} busy={actionBusy} onAction={sendPartnerAction} />
          )}
          {!currentUser && (
            <Link href="/login">
              <Button size="sm">Log in to Partner</Button>
            </Link>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="mt-5 rounded-2xl border border-aura-purple/30 bg-aura-purple/10 px-4 py-3 text-sm font-bold text-white">
          {actionMessage}
        </div>
      )}

      <div className="mt-5 max-w-2xl">
        <p className="text-sm leading-relaxed text-white/60">
          {profile.bio ? renderMentions(profile.bio) : <span className="italic text-white/30">No bio yet.</span>}
        </p>
      </div>

      <div className="mt-4">
        <AuraBadge value={profile.aura} size="lg" trend="neutral" />
      </div>

      {social && !social.isSelf && (
        <button className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55 hover:border-aura-purple/35 hover:text-white">
          {social.mutualPartners} Mutual Partners
        </button>
      )}

      {profile.gender && (
        <div className="mt-4 inline-flex rounded-xl border border-aura-purple/30 bg-aura-purple/10 px-3 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(255,30,30,0.16)]">
          Gender: {profile.gender}
        </div>
      )}

      {!profile.canViewFull && (
        <Card className="mt-8">
          <p className="text-sm text-white/55">This profile is private. Partner up to see full stats and battle activity.</p>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.label} className="text-center">
            <p className="truncate font-display text-2xl font-bold text-gradient-rage">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{item.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          "First Battle",
          profile.wins >= 10 ? "10 Wins" : "Win Seeker",
          profile.currentStreak >= 3 ? "Hot Streak" : "Season Climber",
        ].map((badge) => (
          <Card key={badge} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-aura-purple/25 bg-aura-purple/10 text-aura-purple">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8L12 3z" />
              </svg>
            </span>
            <div>
              <p className="font-display text-sm font-black">{badge}</p>
              <p className="text-xs text-white/35">Achievement</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-10 mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-black">Battle History</h2>
          <span className="font-mono text-xs text-white/35">@{profile.userId}</span>
        </div>

        {battles.length === 0 ? (
          <Card>
            <p className="text-sm text-white/50">No public battles yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {battles.map((battle) => {
              const opponent =
                battle.creator_id === profile.id
                  ? battle.opponent_username
                  : battle.creator_username;
              const won = battle.winner_id === profile.id;
              const completed = battle.status === "completed";

              return (
                <Card key={battle.id} className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                    won
                      ? "border-aura-green/20 bg-aura-green/15 text-aura-green"
                      : completed
                      ? "border-aura-purple/20 bg-aura-purple/15 text-aura-purple"
                      : "border-white/8 bg-white/[0.04] text-white/35"
                  }`}>
                    {won ? "W" : completed ? "L" : "-"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link href={`/battles/${battle.id}`} className="hover:text-aura-purple">
                      <p className="truncate text-sm font-semibold">{battle.title}</p>
                    </Link>
                    <p className="mt-0.5 text-xs text-white/35">
                      <span className="capitalize">{battle.topic}</span>
                      {opponent && ` · vs ${opponent}`}
                      {" · "}
                      <span className="capitalize">{battle.status}</span>
                    </p>
                  </div>

                  <Link href={`/battles/${battle.id}`}>
                    <Button size="sm" variant="secondary">View</Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
