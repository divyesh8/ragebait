"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

type Relationship = "self" | "partner" | "incoming_request" | "outgoing_request" | "blocked" | "none";

interface PlayerSearchResult {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string;
  languages: string[];
  aura: number;
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  totalBattles: number;
  rank: string;
  favoriteBattleCategory: string;
  status: string;
  lastActive: string | null;
  relationship: Relationship;
  pendingRequestId: string | null;
  mutualPartners: number;
}

interface PartnerRequestCard {
  id: string;
  status: string;
  createdAt: string;
  user: PlayerSearchResult;
}

interface PartnerCard {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  aura: number;
  level: number;
  rank: string;
  status: string;
  lastActive: string | null;
  currentActivity: string;
  mutualPartners: number;
  partneredAt: string;
}

function avatarFor(username: string, url: string | null | undefined) {
  return url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

function statusClass(status: string) {
  if (status === "Online") return "bg-emerald-300";
  if (status === "In Battle") return "bg-aura-purple";
  if (status === "Training") return "bg-white";
  return "bg-white/25";
}

export default function PartnersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [received, setReceived] = useState<PartnerRequestCard[]>([]);
  const [sent, setSent] = useState<PartnerRequestCard[]>([]);
  const [partners, setPartners] = useState<PartnerCard[]>([]);
  const [requestTab, setRequestTab] = useState<"received" | "sent">("received");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    const res = await fetch("/api/partners", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setReceived(data.received ?? []);
    setSent(data.sent ?? []);
    setPartners(data.partners ?? []);
  }, []);

  useEffect(() => {
    if (user) loadPartners();
  }, [user, loadPartners]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPlayers([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(trimmed)}`, { credentials: "include" });
        const data = await res.json();
        setPlayers(data.players ?? []);
      } catch {
        setPlayers([]);
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const activeRequests = requestTab === "received" ? received : sent;
  const onlineCount = useMemo(() => partners.filter((partner) => partner.status !== "Offline").length, [partners]);

  async function sendRequest(player: PlayerSearchResult) {
    setBusyId(player.id);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: player.id }),
      });
      const data = await res.json();
      setToast(res.ok ? "Partner request sent." : data.error ?? "Could not send request.");
      await loadPartners();
      if (query.trim().length >= 2) {
        const refreshed = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`, { credentials: "include" }).then((r) => r.json());
        setPlayers(refreshed.players ?? []);
      }
    } finally {
      setBusyId(null);
      window.setTimeout(() => setToast(null), 2400);
    }
  }

  async function requestAction(requestId: string, action: "accept" | "reject" | "cancel") {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/partners/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setToast(res.ok ? action === "accept" ? "Partner added." : "Request updated." : data.error ?? "Could not update request.");
      await loadPartners();
    } finally {
      setBusyId(null);
      window.setTimeout(() => setToast(null), 2400);
    }
  }

  async function removePartner(partnerId: string) {
    if (!window.confirm("Remove this partner?")) return;
    setBusyId(partnerId);
    try {
      const res = await fetch(`/api/partners/${partnerId}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      setToast(res.ok ? "Partner removed." : data.error ?? "Could not remove partner.");
      await loadPartners();
    } finally {
      setBusyId(null);
      window.setTimeout(() => setToast(null), 2400);
    }
  }

  if (userLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-white/45">Loading partners...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-black">Partners</h1>
        <p className="mt-3 text-sm text-white/45">Log in to search players and build your partner list.</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-aura-purple">Partners</p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">Social Arena</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
            Search players, manage requests, and keep your battle circle ready.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
          <Metric value={partners.length} label="Partners" />
          <Metric value={received.length} label="Received" />
          <Metric value={onlineCount} label="Active" />
        </div>
      </header>

      {toast && (
        <div className="mb-4 rounded-2xl border border-aura-purple/30 bg-aura-purple/10 px-4 py-3 text-sm font-bold text-white shadow-glow-sm">
          {toast}
        </div>
      )}

      <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl sm:p-5">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-4 py-3 focus-within:border-aura-purple/50 focus-within:shadow-glow-sm">
          <svg className="h-5 w-5 text-white/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Username or Player ID"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white placeholder:text-white/28 focus:outline-none"
          />
          {searching && <span className="h-2 w-2 animate-pulse rounded-full bg-aura-purple" />}
        </div>

        {query.trim().length >= 2 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {players.map((player) => (
              <PlayerResultCard key={player.id} player={player} busy={busyId === player.id} onSend={() => sendRequest(player)} onRequestAction={requestAction} />
            ))}
            {!searching && players.length === 0 && (
              <div className="rounded-2xl border border-white/8 bg-black/25 px-5 py-8 text-center text-sm text-white/38 lg:col-span-2">
                No players matched that search.
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-black">Partner Requests</h2>
            <div className="flex rounded-full border border-white/10 bg-black/35 p-1">
              {(["received", "sent"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRequestTab(tab)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                    requestTab === tab ? "bg-aura-purple text-white shadow-glow-sm" : "text-white/45 hover:text-white"
                  }`}
                >
                  {tab === "received" ? "Received" : "Sent"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {activeRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                mode={requestTab}
                busy={busyId === request.id}
                onAction={requestAction}
              />
            ))}
            {activeRequests.length === 0 && (
              <div className="rounded-2xl border border-white/8 bg-black/20 px-5 py-10 text-center text-sm text-white/35">
                No {requestTab} requests.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-black">My Partners</h2>
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/40">
              {partners.length} total
            </span>
          </div>

          {partners.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-black/20 px-5 py-14 text-center text-sm text-white/35">
              Search for players to start building your partner list.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {partners.map((partner) => (
                <PartnerTile key={partner.id} partner={partner} busy={busyId === partner.id} onRemove={() => removePartner(partner.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <p className="font-display text-2xl font-black">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

function PlayerResultCard({
  player,
  busy,
  onSend,
  onRequestAction,
}: {
  player: PlayerSearchResult;
  busy: boolean;
  onSend: () => void;
  onRequestAction: (requestId: string, action: "accept" | "reject" | "cancel") => void;
}) {
  return (
    <div className="animate-cardIn rounded-3xl border border-white/10 bg-black/28 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-4">
        <img src={avatarFor(player.username, player.avatarUrl)} alt={player.username} className="h-16 w-16 rounded-2xl border border-aura-purple/35" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/profile/${player.userId}`} className="truncate font-display text-lg font-black hover:text-aura-purple">
              {player.username}
            </Link>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase text-white/45">
              {player.rank}
            </span>
          </div>
          <p className="font-mono text-[11px] text-white/35">ID {player.userId}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/45">{player.bio || "No bio yet."}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Aura" value={player.aura} />
        <MiniStat label="Level" value={player.level} />
        <MiniStat label="Wins" value={player.wins} />
        <MiniStat label="WR" value={`${player.winRate}%`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/profile/${player.userId}`}>
          <Button size="sm" variant="secondary">View Full Profile</Button>
        </Link>
        <PartnerActionButton player={player} busy={busy} onSend={onSend} onRequestAction={onRequestAction} />
        <Button size="sm" variant="ghost" disabled>Challenge</Button>
        <button
          onClick={() => navigator.clipboard.writeText(player.userId)}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/55 transition hover:text-white"
        >
          Copy Player ID
        </button>
      </div>
    </div>
  );
}

function PartnerActionButton({
  player,
  busy,
  onSend,
  onRequestAction,
}: {
  player: PlayerSearchResult;
  busy: boolean;
  onSend: () => void;
  onRequestAction: (requestId: string, action: "accept" | "reject" | "cancel") => void;
}) {
  if (player.relationship === "self") return <Button size="sm" variant="ghost" disabled>You</Button>;
  if (player.relationship === "partner") return <Button size="sm" variant="secondary" disabled>Partner</Button>;
  if (player.relationship === "incoming_request" && player.pendingRequestId) {
    return <Button size="sm" disabled={busy} onClick={() => onRequestAction(player.pendingRequestId!, "accept")}>{busy ? "Accepting..." : "Accept Request"}</Button>;
  }
  if (player.relationship === "outgoing_request" && player.pendingRequestId) {
    return <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRequestAction(player.pendingRequestId!, "cancel")}>{busy ? "Cancelling..." : "Cancel Request"}</Button>;
  }
  if (player.relationship === "blocked") return <Button size="sm" variant="ghost" disabled>Unavailable</Button>;
  return <Button size="sm" disabled={busy} onClick={onSend}>{busy ? "Sending..." : "Send Partner Request"}</Button>;
}

function RequestCard({
  request,
  mode,
  busy,
  onAction,
}: {
  request: PartnerRequestCard;
  mode: "received" | "sent";
  busy: boolean;
  onAction: (requestId: string, action: "accept" | "reject" | "cancel") => void;
}) {
  const player = request.user;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-3">
        <img src={avatarFor(player.username, player.avatarUrl)} alt={player.username} className="h-12 w-12 rounded-2xl border border-white/10" />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${player.userId}`} className="truncate font-display text-base font-black hover:text-aura-purple">
            {player.username}
          </Link>
          <p className="text-xs text-white/38">Level {player.level} / {player.rank} / {player.mutualPartners} mutual</p>
        </div>
        <AuraBadge value={player.aura} size="xs" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "received" ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => onAction(request.id, "accept")}>Accept</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(request.id, "reject")}>Reject</Button>
          </>
        ) : (
          <>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/35">Pending</span>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(request.id, "cancel")}>Cancel Request</Button>
          </>
        )}
      </div>
    </div>
  );
}

function PartnerTile({ partner, busy, onRemove }: { partner: PartnerCard; busy: boolean; onRemove: () => void }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4 transition hover:-translate-y-0.5 hover:border-aura-purple/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={avatarFor(partner.username, partner.avatarUrl)} alt={partner.username} className="h-14 w-14 rounded-2xl border border-aura-purple/30" />
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black ${statusClass(partner.status)}`} />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${partner.userId}`} className="truncate font-display text-lg font-black hover:text-aura-purple">
            {partner.username}
          </Link>
          <p className="text-xs text-white/40">{partner.country} / {partner.status}</p>
        </div>
        <AuraBadge value={partner.aura} size="xs" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Rank" value={partner.rank} />
        <MiniStat label="Level" value={partner.level} />
        <MiniStat label="Mutual" value={partner.mutualPartners} />
      </div>

      <p className="mt-3 truncate rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/42">
        {partner.currentActivity || "Browsing"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/profile/${partner.userId}`}>
          <Button size="sm" variant="secondary">View Profile</Button>
        </Link>
        <Button size="sm" variant="ghost" disabled>Message</Button>
        <Button size="sm" variant="ghost" disabled>Invite</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onRemove}>{busy ? "Removing..." : "Remove"}</Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2">
      <p className="truncate font-display text-sm font-black text-white">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-white/30">{label}</p>
    </div>
  );
}
