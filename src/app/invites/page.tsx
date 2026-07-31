"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ChallengeForm from "@/components/battle/ChallengeForm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface Invite {
  id: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  rounds: number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
  battle_id: string | null;
  from_user_id: string;
  from_username: string;
  from_avatar: string;
  to_user_id: string;
  to_username: string;
  to_avatar: string;
}

function avatarFor(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

const statusStyles: Record<string, string> = {
  pending: "text-white/70",
  accepted: "text-white/70",
  rejected: "text-white/30",
  cancelled: "text-white/30",
  expired: "text-white/30",
};

export default function InvitesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [box, setBox] = useState<"received" | "sent">("received");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);

  const load = useCallback(async (which: "received" | "sent") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invites?box=${which}`);
      const data = await res.json();
      setInvites(data.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(box);
  }, [box, load]);

  async function act(id: string, action: "accept" | "reject" | "cancel") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete that action.");
        return;
      }
      if (action === "accept" && data.battle?.id) {
        router.push(`/battles/${data.battle.id}`);
        return;
      }
      await load(box);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  if (userLoading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">You&apos;re not logged in</h1>
        <p className="mt-2 text-white/50">Log in to see and send battle challenges.</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Challenges</h1>
        <Button onClick={() => setShowChallenge(true)}>+ Challenge a player</Button>
      </div>

      <div className="mb-6 flex gap-2 rounded-full bg-white/[0.04] p-1 w-fit">
        {(["received", "sent"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBox(b)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              box === b ? "bg-aura-gradient text-void" : "text-white/50 hover:text-white"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/50">Loading...</p>
      ) : invites.length === 0 ? (
        <Card className="text-center">
          <p className="text-white/60">
            {box === "received" ? "No challenges waiting on you." : "You haven't sent any challenges yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => {
            const other = box === "received" ? { name: inv.from_username, avatar: inv.from_avatar } : { name: inv.to_username, avatar: inv.to_avatar };
            return (
              <Card key={inv.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={avatarFor(other.name, other.avatar)} alt={other.name} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold">
                      {box === "received" ? `@${other.name} challenged you` : `You challenged @${other.name}`}
                    </p>
                    <p className="text-xs text-white/40">{inv.title} · {inv.topic} · {inv.rounds} rounds</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase ${statusStyles[inv.status]}`}>
                    {inv.status}
                  </span>
                  {inv.status === "pending" && box === "received" && (
                    <>
                      <Button size="sm" onClick={() => act(inv.id, "accept")} disabled={busyId === inv.id}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(inv.id, "reject")} disabled={busyId === inv.id}>
                        Reject
                      </Button>
                    </>
                  )}
                  {inv.status === "pending" && box === "sent" && (
                    <Button size="sm" variant="ghost" onClick={() => act(inv.id, "cancel")} disabled={busyId === inv.id}>
                      Cancel
                    </Button>
                  )}
                  {inv.status === "accepted" && inv.battle_id && (
                    <Link href={`/battles/${inv.battle_id}`}>
                      <Button size="sm" variant="secondary">
                        Go to battle
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showChallenge && (
        <ChallengeForm onSent={() => load(box)} onClose={() => setShowChallenge(false)} />
      )}
    </div>
  );
}
