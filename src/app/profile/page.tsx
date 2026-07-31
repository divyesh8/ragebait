"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import Button from "@/components/ui/Button";
import AvatarPicker from "@/components/profile/AvatarPicker";
import { updateCurrentUserCache, useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useEffect, useState, useRef } from "react";

interface AuraTransaction {
  id: string;
  amount: number;
  reason: string;
  battle_id: string | null;
  created_at: string;
}

interface BattleItem {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  status: string;
  battle_type: string;
  creator_id: string;
  winner_id: string | null;
  opponent_username: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading, refresh } = useCurrentUser();

  const [history, setHistory]               = useState<AuraTransaction[]>([]);
  const [battles, setBattles]               = useState<BattleItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [battlesLoading, setBattlesLoading] = useState(true);

  // Avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarOverride, setAvatarOverride]     = useState<string | null>(null);
  const [profileNotice, setProfileNotice]       = useState<string | null>(null);
  const profileNoticeTimerRef = useRef<number | null>(null);

  // Bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue]     = useState("");
  const [bioSaving, setBioSaving]   = useState(false);
  const [bioError, setBioError]     = useState<string | null>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  // Battle deletion
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);

  // Tab
  const [tab, setTab] = useState<"aura" | "battles">("aura");

  useEffect(() => {
    if (!user) { setHistoryLoading(false); setBattlesLoading(false); return; }
    setBioValue(user.bio || "");

    fetch("/api/aura/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.transactions ?? d.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));

    fetch("/api/battles")
      .then((r) => r.json())
      .then((d) => {
        const all: BattleItem[] = d.battles ?? [];
        setBattles(all.filter((b) => b.creator_id === user.id));
      })
      .catch(() => setBattles([]))
      .finally(() => setBattlesLoading(false));
  }, [user]);

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (editingBio) bioRef.current?.focus();
  }, [editingBio]);

  useEffect(() => {
    return () => {
      if (profileNoticeTimerRef.current !== null) {
        window.clearTimeout(profileNoticeTimerRef.current);
      }
    };
  }, []);

  async function saveBio() {
    setBioSaving(true);
    setBioError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setBioError(data.error ?? "Failed to save."); setBioSaving(false); return; }
      await refresh();
      setEditingBio(false);
    } catch {
      setBioError("Could not reach server.");
    }
    setBioSaving(false);
  }

  async function deleteBattle(battleId: string) {
    setDeletingId(battleId);
    try {
      const res = await fetch(`/api/battles/${battleId}`, { method: "DELETE" });
      if (res.ok) {
        setBattles((prev) => prev.filter((b) => b.id !== battleId));
      }
    } catch {}
    setDeletingId(null);
    setConfirmDelete(null);
  }

  async function copyUserId() {
    await navigator.clipboard.writeText(user?.userId ?? "");
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">You&apos;re not logged in</h1>
        <p className="mt-2 text-white/50">Log in to see your profile.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login"><Button size="md">Log in</Button></Link>
          <Link href="/signup"><Button size="md" variant="secondary">Sign up</Button></Link>
        </div>
      </div>
    );
  }

  const totalBattles = user.wins + user.losses;
  const winRate = totalBattles > 0 ? Math.round((user.wins / totalBattles) * 100) : 0;
  const avatarUrl = avatarOverride || user.avatar_url ||
    `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;

  const statItems = [
    { label: "Level",          value: user.level },
    { label: "XP",             value: user.xp.toLocaleString() },
    { label: "Wins",           value: user.wins },
    { label: "Losses",         value: user.losses },
    { label: "Win Rate",       value: `${winRate}%` },
    { label: "Total Battles",  value: totalBattles },
    { label: "Current Streak", value: user.current_streak },
    { label: "Best Streak",    value: user.best_streak },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {profileNotice && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-[#20E3B2]/35 bg-[#20E3B2]/10 px-4 py-3 text-sm font-semibold text-[#9FFFE9]">
          {profileNotice}
        </div>
      )}

      {/* ── Banner ── */}
      <div className="relative h-40 rounded-2xl bg-aura-gradient sm:h-56" />

      {/* ── Avatar + name row ── */}
      <div className="relative -mt-12 flex flex-col items-start gap-4 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          {/* Avatar — click to change */}
          <div className="group relative">
            <img
              src={avatarUrl}
              alt={user.username}
              className="h-24 w-24 rounded-2xl border-4 border-void bg-white/[0.04] sm:h-28 sm:w-28 cursor-pointer"
              onClick={() => setShowAvatarPicker(true)}
            />
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
            >
              Change
            </button>
          </div>

          <div className="pb-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{user.username}</h1>
            <p className="text-sm text-white/40">
              Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-white/35">ID</p>
            <p className="font-mono text-sm font-bold text-white">{user.userId}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={copyUserId}>
            {idCopied ? "Copied!" : "Copy"}
          </Button>
          <Link href="/settings">
            <Button size="sm" variant="secondary">Settings</Button>
          </Link>
          <Link href="/battles">
            <Button size="sm">+ Start a battle</Button>
          </Link>
        </div>
      </div>

      {/* ── Avatar picker modal ── */}
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatarUrl={avatarUrl}
          onSelected={(newUrl) => {
            setAvatarOverride(newUrl);
            updateCurrentUserCache({ avatar_url: newUrl });
            setProfileNotice("Profile picture saved across your profile.");
            if (profileNoticeTimerRef.current !== null) {
              window.clearTimeout(profileNoticeTimerRef.current);
            }
            profileNoticeTimerRef.current = window.setTimeout(() => setProfileNotice(null), 2400);
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {/* ── Bio — Instagram-style inline edit ── */}
      <div className="mt-5 max-w-2xl">
        {editingBio ? (
          <div className="space-y-2">
            <textarea
              ref={bioRef}
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Write something about yourself... (160 chars max)"
              className="w-full rounded-xl border border-aura-purple/50 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-aura-purple/30 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveBio(); }
                if (e.key === "Escape") { setEditingBio(false); setBioValue(user.bio || ""); }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveBio} disabled={bioSaving}>
                {bioSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditingBio(false); setBioValue(user.bio || ""); }}>
                Cancel
              </Button>
              <span className="ml-auto text-xs text-white/25 font-mono">{bioValue.length}/160</span>
            </div>
            {bioError && <p className="text-xs text-aura-purple">{bioError}</p>}
          </div>
        ) : (
          <div
            onClick={() => setEditingBio(true)}
            className="group flex cursor-pointer items-start gap-2 rounded-xl px-1 py-1 transition hover:bg-white/5"
            title="Click to edit bio"
          >
            <p className="text-white/60 text-sm leading-relaxed flex-1">
              {user.bio || <span className="italic text-white/25">No bio yet — click to add one</span>}
            </p>
            {/* Edit pencil icon */}
            <svg className="h-4 w-4 flex-shrink-0 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Aura badge ── */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <AuraBadge value={user.aura} size="lg" trend="neutral" />
        <div className="rounded-xl border border-aura-purple/25 bg-aura-purple/10 px-3 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(255,30,30,0.16)]">
          Gender: {user.gender ?? "Not set"}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/55">
          Public gender: {user.showGenderOnPublicProfile ? "Enabled" : "Disabled"}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.label} className="text-center">
            <p className="font-display text-2xl font-bold text-gradient">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div className="mt-10 flex gap-1 rounded-2xl border border-white/8 bg-[#0a0a0a] p-1 w-fit">
        <button
          onClick={() => setTab("aura")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "aura" ? "bg-aura-purple text-void shadow-glow-sm" : "text-white/50 hover:text-white"}`}
        >
          ⚡ Aura History
        </button>
        <button
          onClick={() => setTab("battles")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${tab === "battles" ? "bg-aura-purple text-void shadow-glow-sm" : "text-white/50 hover:text-white"}`}
        >
          ⚔️ My Battles
        </button>
      </div>

      {/* ── Aura History tab ── */}
      {tab === "aura" && (
        <div className="mt-4 mb-12">
          {historyLoading ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : history.length === 0 ? (
            <Card>
              <p className="text-sm text-white/50">No Aura transactions yet. Win a battle!</p>
            </Card>
          ) : (
            <Card className="divide-y divide-line p-0">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium">{tx.reason}</p>
                    <p className="text-xs text-white/40">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${tx.amount > 0 ? "text-white/65" : "text-aura-purple"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── My Battles tab ── */}
      {tab === "battles" && (
        <div className="mt-4 mb-12 space-y-3">
          {battlesLoading ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : battles.length === 0 ? (
            <Card>
              <p className="text-sm text-white/50">You haven&apos;t created any battles yet.</p>
              <div className="mt-3">
                <Link href="/battles"><Button size="sm">Create your first battle</Button></Link>
              </div>
            </Card>
          ) : (
            battles.map((battle) => {
              const isWin  = battle.winner_id === user.id;
              const isLoss = battle.status === "completed" && battle.winner_id && !isWin;
              const canDelete = battle.status === "waiting" || battle.status === "cancelled" || battle.status === "expired";

              return (
                <Card key={battle.id} className="flex items-center gap-4">
                  {/* Result indicator */}
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isWin  ? "bg-aura-green/15 text-aura-green border border-aura-green/20" :
                    isLoss ? "bg-aura-purple/15 text-aura-purple border border-aura-purple/20" :
                    "bg-white/[0.04] text-white/30 border border-white/8"
                  }`}>
                    {isWin ? "W" : isLoss ? "L" : "—"}
                  </div>

                  {/* Battle info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/battles/${battle.id}`} className="hover:text-aura-purple transition-colors">
                      <p className="text-sm font-semibold truncate">{battle.title}</p>
                    </Link>
                    <p className="text-xs text-white/35 mt-0.5">
                      <span className="capitalize">{battle.topic}</span>
                      {battle.opponent_username && ` · vs ${battle.opponent_username}`}
                      {" · "}
                      <span className={`capitalize font-medium ${
                        battle.status === "waiting" ? "text-white/65" :
                        battle.status === "active"  ? "text-aura-purple" :
                        battle.status === "completed" ? "text-white/40" :
                        "text-aura-purple"
                      }`}>{battle.status}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/battles/${battle.id}`}>
                      <Button size="sm" variant="secondary">View</Button>
                    </Link>

                    {canDelete && (
                      <>
                        {confirmDelete === battle.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-white/50">Sure?</span>
                            <Button
                               size="sm"
                               variant="danger"
                               disabled={deletingId === battle.id}
                               onClick={() => deleteBattle(battle.id)}
>
                               {deletingId === battle.id ? "Deleting..." : "Delete"}
                                </Button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs text-white/40 hover:text-white px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(battle.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 hover:bg-aura-purple/10 hover:text-aura-purple transition-colors"
                            title="Delete battle"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
