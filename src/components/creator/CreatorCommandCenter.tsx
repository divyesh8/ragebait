"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GENDER_OPTIONS, type Gender } from "@/lib/gender";
import CreatorSimulationPanel from "@/components/creator/CreatorSimulationPanel";

// Founder Dashboard v2 — live operations center. Every value shown is real
// data from the creator APIs; signals the platform doesn't collect are not
// rendered. "Live" updates are fast polling (Vercel serverless can't hold
// raw WebSocket connections) with animated transitions on change.

type TrackedUser = {
  id: string; public_id: string; username: string; email: string; email_verified: boolean;
  gender: Gender | null; show_gender_on_public_profile: boolean;
  aura: number; level: number; xp: number; wins: number; losses: number; avatar_url: string;
  account_status: "active" | "frozen" | "banned";
  status_reason: string | null; status_expires_at: string | null; created_at: string;
  aura_rank: number; warnings: number; blocked_messages: number; last_activity: string | null;
};

type LiveBattle = {
  id: string; title: string; topic: string; status: string;
  creator_username: string; opponent_username: string | null;
  created_by: string; opponent_id: string | null;
};

type Totals = Partial<Record<
  | "users" | "restricted_users" | "new_users_24h" | "battles" | "live_battles"
  | "battles_created_24h" | "battles_24h" | "messages_24h" | "ai_decisions_24h"
  | "reports_pending" | "aura_moved_24h" | "total_warns" | "total_blocks", number>>;

type ActivityEvent = { kind: string; label: string; detail: string; at: string };
type AuditLog = { id: string; action: string; reason: string; target_username: string | null; created_at: string };
type Report = {
  id: string; target_type: string; reason: string; description: string | null; created_at: string;
  reporter_username: string; target_username: string | null; target_user_id: string | null;
};
type SearchResults = {
  users: { id: string; public_id: string; username: string; email: string; gender: Gender | null; aura: number; account_status: string }[];
  battles: { id: string; title: string; topic: string; status: string; creator_username: string }[];
  messages: { id: string; battle_id: string; content: string; username: string }[];
};
type CreatorIntelligence = {
  generatedAt: string;
  assistant: {
    platformSummary: string;
    suspiciousUsers: { id: string; username: string; warnings: number; blocks: number; reason: string }[];
    auraFarmers: { id: string; username: string; transactions: number; auraDelta: number; battles: number; reason: string }[];
    trendingTopics: { topic: string; battles: number; messages: number }[];
    playerLosses: { battleId: string; title: string; topic: string; creator: string; opponent: string | null; summary: string; confidence: number }[];
    toxicClusters: { topic: string; moderationEvents: number; users: number }[];
    exploitAttempts: { messageId: string; battleId: string; username: string; content: string; createdAt: string }[];
    liveStrategy: {
      battleId: string;
      title: string;
      topic: string;
      health: { healthyDebate: number; label: string };
      strategy: { side: "creator" | "opponent"; nextLikelyArgument: string; weakness: string; strongCounter: string; direction: string }[];
      directorSynthesis: string;
    }[];
  };
  continuousImprovement: {
    currentVersion: string;
    completedBattlesSampled: number;
    averageConfidence: number;
    modelAgreement: number;
    historicalReplay: string;
    falsePositiveRisk: number;
    falseNegativeRisk: number;
    abTests: { name: string; status: string; guardrail: string }[];
    rollback: { ready: boolean; previousVersion: string; reason: string };
  };
  rageMindX: {
    version: string;
    runs30d: number;
    averageLatencyMs: number;
    averageConfidence: number;
    degradedModuleRuns: number;
    riskLevels: { riskLevel: string; count: number }[];
    moduleTimings: { moduleId: string; moduleName: string; averageMs: number; degraded: number; runs: number }[];
    confidenceTrend: { day: string; averageConfidence: number; runs: number }[];
    languageStats: { language: string; count: number }[];
    unknownPhrases: { phrase: string; count: number }[];
    learningQueue: { status: string; count: number }[];
  };
};

type GenderDistribution = {
  total: number;
  values: { gender: Gender; count: number; percentage: number }[];
};

type Overview = {
  generatedAt: string;
  totals: Totals;
  genderDistribution: GenderDistribution;
  users: TrackedUser[];
  liveBattles: LiveBattle[];
  activity: ActivityEvent[];
};

const HIGH_RISK = new Set([
  "ban_permanent", "ban_temporary", "freeze", "aura_reset", "xp_reset", "delete_battle", "delete_account",
]);

export default function CreatorCommandCenter() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [intelligence, setIntelligence] = useState<CreatorIntelligence | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [banHours, setBanHours] = useState("24");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [announceAudience, setAnnounceAudience] = useState<"all" | "active_7d" | "restricted">("all");
  const [weightsDraft, setWeightsDraft] = useState("");
  const [kbCategory, setKbCategory] = useState("slang");
  const [kbTerm, setKbTerm] = useState("");
  const [kbMeaning, setKbMeaning] = useState("");
  const [selfTest, setSelfTest] = useState<{
    brainVersion: string; passed: number; failed: number; allPass: boolean;
    results: { name: string; expected: string; got: string; pass: boolean }[];
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadOverview = useCallback(async () => {
    const params = new URLSearchParams();
    if (genderFilter !== "all") params.set("gender", genderFilter);
    const res = await fetch(`/api/creator/overview?${params.toString()}`, { credentials: "include" });
    if (res.ok) setOverview(await res.json());
  }, [genderFilter]);
  const loadAudit = useCallback(async (s: string) => {
    const res = await fetch(`/api/creator/audit?search=${encodeURIComponent(s)}`, { credentials: "include" });
    if (res.ok) setAuditLogs((await res.json()).logs ?? []);
  }, []);
  const loadReports = useCallback(async () => {
    const res = await fetch("/api/creator/reports", { credentials: "include" });
    if (res.ok) setReports((await res.json()).reports ?? []);
  }, []);
  const loadIntelligence = useCallback(async () => {
    const res = await fetch("/api/creator/intelligence", { credentials: "include" });
    if (res.ok) setIntelligence(await res.json());
  }, []);

  useEffect(() => {
    loadOverview(); loadAudit(""); loadReports(); loadIntelligence();
    // Prefill the AI Studio weights editor with the live judge.weights rule.
    (async () => {
      const res = await fetch("/api/creator/ai-rules", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const weights = (data.rules ?? []).find((r: any) => r.key === "judge.weights");
        if (weights) setWeightsDraft(JSON.stringify(weights.value, null, 2));
      }
    })();
    const t = window.setInterval(() => { loadOverview(); loadReports(); loadIntelligence(); }, 5000);
    return () => window.clearInterval(t);
  }, [loadOverview, loadAudit, loadReports, loadIntelligence]);

  async function runSelfTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/creator/ai-rules?selftest=1", { credentials: "include" });
      if (res.ok) setSelfTest(await res.json());
      else setFeedback("✗ Self-test failed to run.");
    } finally { setTesting(false); }
  }

  async function saveWeights() {
    const why = requireReason(); if (!why) return;
    let value: unknown;
    try { value = JSON.parse(weightsDraft); } catch { setFeedback("✗ Weights must be valid JSON."); return; }
    const res = await fetch("/api/creator/ai-rules", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ key: "judge.weights", value, reason: why }),
    });
    const data = await res.json();
    setFeedback(res.ok ? "✓ judge weights updated — live within 60s" : `✗ ${data.error}`);
    await loadAudit(auditSearch);
  }

  async function addKnowledge() {
    const why = requireReason(); if (!why) return;
    if (!kbTerm.trim() || !kbMeaning.trim()) { setFeedback("Knowledge entry needs a term and meaning."); return; }
    const res = await fetch("/api/creator/ai-rules", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ category: kbCategory, term: kbTerm.trim(), meaning: kbMeaning.trim(), reason: why }),
    });
    const data = await res.json();
    setFeedback(res.ok ? `✓ knowledge saved: ${data.entry.term} (v${data.entry.version})` : `✗ ${data.error}`);
    if (res.ok) { setKbTerm(""); setKbMeaning(""); }
    await loadAudit(auditSearch);
  }

  // Ctrl+K command palette / search focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        setTimeout(() => searchRef.current?.focus(), 40);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced global search
  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return; }
    const t = window.setTimeout(async () => {
      const res = await fetch(`/api/creator/search?q=${encodeURIComponent(query.trim())}`, { credentials: "include" });
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const selectedUser = useMemo(
    () => overview?.users.find((u) => u.id === selectedUserId) ?? overview?.users[0],
    [overview, selectedUserId]
  );
  const totals = overview?.totals ?? {};

  async function refreshAll() {
    await Promise.all([loadOverview(), loadAudit(auditSearch), loadReports(), loadIntelligence()]);
  }

  function exportUsersCsv() {
    const params = new URLSearchParams();
    if (genderFilter !== "all") params.set("gender", genderFilter);
    if (query.trim().length >= 2) params.set("q", query.trim());
    window.location.href = `/api/creator/users/export?${params.toString()}`;
  }

  function requireReason(): string | null {
    if (reason.trim().length < 3) {
      setFeedback("A reason (3+ characters) is required for every action.");
      return null;
    }
    return reason.trim();
  }

  async function runUserAction(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedUser) return;
    const why = requireReason(); if (!why) return;
    if (HIGH_RISK.has(action) && !window.confirm(
      `HIGH-RISK: ${action.replace(/_/g, " ").toUpperCase()} on @${selectedUser.username}\nReason: ${why}\nAudit-logged permanently. Continue?`)) return;

    setBusy(true); setFeedback(null);
    try {
      const body: Record<string, unknown> = { action, reason: why, ...extra };
      if (action.endsWith("_set") || action.endsWith("_adjust")) {
        const n = parseInt(amount, 10);
        if (!Number.isFinite(n)) { setFeedback("Enter a valid amount first."); setBusy(false); return; }
        body.amount = n;
      }
      if (action === "ban_temporary") body.durationHours = Math.max(1, parseInt(banHours, 10) || 24);
      const res = await fetch(`/api/creator/users/${selectedUser.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      setFeedback(res.ok ? `✓ ${action.replace(/_/g, " ")} → @${selectedUser.username}` : `✗ ${data.error}`);
      await refreshAll();
    } catch { setFeedback("✗ Action failed — network error."); } finally { setBusy(false); }
  }

  async function patchUser(fields: Record<string, unknown>, label: string) {
    if (!selectedUser) return;
    const why = requireReason(); if (!why) return;
    const res = await fetch(`/api/creator/users/${selectedUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ reason: why, ...fields }),
    });
    const data = await res.json();
    setFeedback(res.ok ? `✓ ${label} → @${selectedUser.username}` : `✗ ${data.error}`);
    await refreshAll();
  }

  async function runBattleAction(battle: LiveBattle, action: string, winnerId?: string) {
    const why = window.prompt(`Reason for ${action.replace(/_/g, " ")} on "${battle.title}":`);
    if (!why || why.trim().length < 3) return;
    if (HIGH_RISK.has(action) && !window.confirm(`Confirm ${action.replace(/_/g, " ")} — audit-logged.`)) return;
    const res = await fetch(`/api/creator/battles/${battle.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action, reason: why.trim(), winnerId }),
    });
    const data = await res.json();
    setFeedback(res.ok ? `✓ ${action.replace(/_/g, " ")}: ${battle.title}` : `✗ ${data.error}`);
    await refreshAll();
  }

  async function resolveReport(report: Report, action: string) {
    const why = window.prompt(`Reason for "${action}" on report against @${report.target_username ?? report.target_type}:`);
    if (!why || why.trim().length < 3) return;
    const res = await fetch("/api/creator/reports", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ reportId: report.id, action, reason: why.trim(), durationHours: Math.max(1, parseInt(banHours, 10) || 24) }),
    });
    const data = await res.json();
    setFeedback(res.ok ? `✓ report ${data.status}` : `✗ ${data.error}`);
    await refreshAll();
  }

  async function sendAnnouncement() {
    const why = requireReason(); if (!why) return;
    if (announceTitle.trim().length < 2 || announceBody.trim().length < 2) {
      setFeedback("Announcement needs a title and body."); return;
    }
    if (!window.confirm(`Broadcast "${announceTitle}" to ${announceAudience.replace("_", " ")}?`)) return;
    const res = await fetch("/api/creator/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ title: announceTitle.trim(), body: announceBody.trim(), audience: announceAudience, reason: why }),
    });
    const data = await res.json();
    setFeedback(res.ok ? `✓ announcement sent to ${data.recipients} users` : `✗ ${data.error}`);
    if (res.ok) { setAnnounceTitle(""); setAnnounceBody(""); }
    await refreshAll();
  }

  const statCards: { label: string; value: number; detail: string }[] = [
    { label: "Total Users", value: totals.users ?? 0, detail: `${totals.new_users_24h ?? 0} new today` },
    { label: "Active Battles", value: totals.live_battles ?? 0, detail: `${totals.battles ?? 0} all-time` },
    { label: "Battles Today", value: totals.battles_created_24h ?? 0, detail: `${totals.battles_24h ?? 0} finished` },
    { label: "Messages Today", value: totals.messages_24h ?? 0, detail: "battle messages, 24h" },
    { label: "AI Decisions Today", value: totals.ai_decisions_24h ?? 0, detail: "moderation verdicts, 24h" },
    { label: "Reports Pending", value: totals.reports_pending ?? 0, detail: "awaiting founder review" },
    { label: "Aura Moved 24h", value: totals.aura_moved_24h ?? 0, detail: "total aura transacted" },
    { label: "Restricted", value: totals.restricted_users ?? 0, detail: `${totals.total_warns ?? 0} warns • ${totals.total_blocks ?? 0} blocks` },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,43,43,0.18),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,43,43,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto max-w-[1800px]">
        {/* Activity ticker */}
        <div className="mb-4 overflow-hidden rounded-full border border-red-400/20 bg-black/40 backdrop-blur-xl">
          <div className="flex animate-[ticker_40s_linear_infinite] gap-10 whitespace-nowrap px-4 py-2 text-[11px] text-white/55 hover:[animation-play-state:paused]">
            {(overview?.activity?.length ? overview.activity : [{ kind: "system", label: "LIVE", detail: "Waiting for platform events…", at: "" }])
              .map((ev, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${ev.kind === "founder" ? "bg-red-400" : "bg-amber-300"} shadow-[0_0_8px_currentColor]`} />
                  <b className="uppercase tracking-wider text-white/75">{ev.label}</b> {ev.detail?.slice(0, 90)}
                </span>
              ))}
          </div>
          <style>{`@keyframes ticker{0%{transform:translateX(2%)}100%{transform:translateX(-100%)}}
@keyframes statpulse{0%{box-shadow:0 0 0 rgba(255,43,43,0)}35%{box-shadow:0 0 32px rgba(255,43,43,0.45)}100%{box-shadow:0 0 0 rgba(255,43,43,0)}}`}</style>
        </div>

        {/* Command bar */}
        <header className="mb-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200">👑 Founder Dashboard</p>
              <h2 className="mt-1 font-display text-2xl font-black sm:text-3xl">Ragebait Live Operations</h2>
            </div>
            <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users, battles, messages, gender…  (Ctrl+K)"
                  className="w-full rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none focus:shadow-[0_0_24px_rgba(255,43,43,0.25)]"
                />
                {results && (query.trim().length >= 2 || paletteOpen) && (
                  <div className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-3xl border border-red-400/25 bg-[#0a0a0a]/95 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <SearchGroup title="Users">
                      {results.users.map((u) => (
                        <button key={u.id} onClick={() => { setSelectedUserId(u.id); setQuery(""); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-red-500/10">
                          <b>@{u.username}</b> <span className="text-white/40">{u.email} • ID {u.public_id} • {u.gender ?? "Gender unknown"} • {u.aura} aura</span>
                          {u.account_status !== "active" && <span className="ml-2 rounded bg-red-500/25 px-1.5 text-[10px] uppercase">{u.account_status}</span>}
                        </button>
                      ))}
                    </SearchGroup>
                    <SearchGroup title="Battles">
                      {results.battles.map((b) => (
                        <div key={b.id} className="rounded-xl px-3 py-2 text-xs">
                          <b>{b.title}</b> <span className="text-white/40">{b.topic} • {b.status} • by @{b.creator_username}</span>
                        </div>
                      ))}
                    </SearchGroup>
                    <SearchGroup title="Messages">
                      {results.messages.map((m) => (
                        <div key={m.id} className="rounded-xl px-3 py-2 text-xs text-white/70">
                          <b>@{m.username}:</b> {m.content.slice(0, 90)}
                        </div>
                      ))}
                    </SearchGroup>
                    {!results.users.length && !results.battles.length && !results.messages.length && (
                      <p className="px-3 py-2 text-xs text-white/40">No matches.</p>
                    )}
                  </div>
                )}
              </div>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as Gender | "all")}
                aria-label="Filter users by gender"
                className="rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-red-400/40 focus:outline-none"
              >
                <option value="all">All genders</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportUsersCsv}
                className="rounded-full border border-red-400/35 bg-red-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/30"
              >
                Export CSV
              </button>
            </div>
          </div>
          {feedback && (
            <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100">{feedback}</p>
          )}
        </header>

        {/* Stat grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {overview
            ? statCards.map((c) => <StatCard key={c.label} {...c} />)
            : Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {overview
            ? overview.genderDistribution.values.map((item) => (
                <div key={item.gender} className="rounded-[1.5rem] border border-red-400/20 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">{item.gender}</p>
                    <p className="font-mono text-xs text-white/45">{item.count.toLocaleString()} users</p>
                  </div>
                  <p className="mt-2 font-display text-3xl font-black text-white">{item.percentage}%</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-aura-gradient shadow-[0_0_18px_rgba(255,30,30,0.55)] transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            : Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <main className="space-y-4">
            {/* User tracker */}
            <Panel title="User Tracker" badge="Live • 5s">
              <div className="grid gap-3 lg:grid-cols-2">
                {overview
                  ? overview.users.map((user) => (
                      <button key={user.id} onClick={() => setSelectedUserId(user.id)}
                        className={`rounded-3xl border p-4 text-left transition hover:border-red-400/35 hover:bg-red-500/10 ${selectedUser?.id === user.id ? "border-red-400/50 bg-red-500/10" : "border-white/8 bg-black/25"}`}>
                        <div className="flex items-center gap-3">
                          <img src={user.avatar_url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}`} alt={user.username} className="h-12 w-12 rounded-2xl border border-red-400/35" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">
                              {user.username}
                              {user.email_verified && <span className="ml-1 text-emerald-300">✓</span>}
                              {user.account_status !== "active" && (
                                <span className="ml-2 rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-black uppercase text-red-200">{user.account_status}</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-white/40">{user.email}</p>
                          </div>
                          <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-100">#{user.aura_rank}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55 sm:grid-cols-5">
                          <Signal label="Gender" value={user.gender ?? "Unknown"} />
                          <Signal label="Aura" value={user.aura.toLocaleString()} />
                          <Signal label="XP" value={user.xp.toLocaleString()} />
                          <Signal label="W/L" value={`${user.wins}/${user.losses}`} />
                          <Signal label="Warns" value={user.warnings} />
                        </div>
                      </button>
                    ))
                  : Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} tall />)}
              </div>
            </Panel>

            {/* Battles */}
            <Panel title="Live Battle Control">
              {(overview?.liveBattles ?? []).length === 0 && <p className="text-sm text-white/40">No open or live battles right now.</p>}
              <div className="space-y-2">
                {(overview?.liveBattles ?? []).map((battle) => (
                  <div key={battle.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black/25 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{battle.title}</p>
                      <p className="truncate text-xs text-white/40">{battle.creator_username} vs {battle.opponent_username ?? "—"} • {battle.status}</p>
                    </div>
                    <Chip onClick={() => runBattleAction(battle, "force_end")}>Force End</Chip>
                    {battle.opponent_id && (
                      <>
                        <Chip onClick={() => runBattleAction(battle, "override_winner", battle.created_by)}>Win: {battle.creator_username}</Chip>
                        <Chip onClick={() => runBattleAction(battle, "override_winner", battle.opponent_id!)}>Win: {battle.opponent_username}</Chip>
                        <Chip onClick={() => runBattleAction(battle, "declare_draw")}>Draw</Chip>
                      </>
                    )}
                    <Chip danger onClick={() => runBattleAction(battle, "delete_battle")}>Delete</Chip>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Reports */}
            <Panel title="Live Reports" badge={`${reports.length} pending`}>
              {reports.length === 0 && <p className="text-sm text-white/40">No pending reports. Clean arena. 🧼</p>}
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/8 bg-black/25 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <p><b>@{r.reporter_username}</b> reported <b className="text-red-200">{r.target_username ? `@${r.target_username}` : r.target_type}</b> — {r.reason}</p>
                      <span className="text-white/35">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.description && <p className="mt-1 text-xs text-white/55">{r.description.slice(0, 200)}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip onClick={() => resolveReport(r, "dismiss")}>Dismiss</Chip>
                      <Chip onClick={() => resolveReport(r, "warn")}>Warn</Chip>
                      <Chip onClick={() => resolveReport(r, "mute")}>Mute</Chip>
                      <Chip danger onClick={() => resolveReport(r, "ban_temporary")}>Temp Ban</Chip>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Audit */}
            <Panel title="Audit Log — Immutable" badge="Append-only">
              <input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAudit(auditSearch)}
                placeholder="Search actions, reasons, users… (Enter)"
                className="mb-3 w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none"
              />
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {auditLogs.length === 0 && <p className="text-sm text-white/40">No creator actions recorded yet.</p>}
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-white/8 bg-black/25 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black uppercase tracking-wide text-red-200">{log.action}</span>
                      <span className="text-white/35">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-white/70">{log.target_username ? `@${log.target_username} — ` : ""}{log.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </main>

          <aside className="space-y-4">
            {/* Profile drawer */}
            <Panel title="User Inspector">
              {selectedUser ? (
                <div>
                  <div className="flex items-center gap-3">
                    <img src={selectedUser.avatar_url || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(selectedUser.username)}`} alt={selectedUser.username} className="h-14 w-14 rounded-2xl border border-red-400/40" />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-xl font-black">{selectedUser.username}</h3>
                      <p className="truncate text-xs text-white/45">ID {selectedUser.public_id}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Signal label="Status" value={selectedUser.account_status} />
                    <Signal label="Gender" value={selectedUser.gender ?? "Unknown"} />
                    <Signal label="Rank" value={`#${selectedUser.aura_rank}`} />
                    <Signal label="Aura" value={selectedUser.aura.toLocaleString()} />
                    <Signal label="XP" value={selectedUser.xp.toLocaleString()} />
                    <Signal label="Verified" value={selectedUser.email_verified ? "Yes" : "No"} />
                    <Signal label="Warnings" value={selectedUser.warnings} />
                    <Signal label="Blocked" value={selectedUser.blocked_messages} />
                    <Signal label="Last Active" value={selectedUser.last_activity ? new Date(selectedUser.last_activity).toLocaleDateString() : "Never"} />
                  </div>
                  {selectedUser.status_reason && (
                    <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100">
                      {selectedUser.status_reason}
                      {selectedUser.status_expires_at && ` (until ${new Date(selectedUser.status_expires_at).toLocaleString()})`}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-white/45">No users yet.</p>}
            </Panel>

            {/* Founder actions */}
            <Panel title="Founder Actions" accent>
              <p className="text-[11px] text-white/45">Reason required. Confirmed. Audit-logged. Forever.</p>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)…"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
              <div className="mt-2 flex gap-2">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" inputMode="numeric"
                  className="w-1/2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
                <input value={banHours} onChange={(e) => setBanHours(e.target.value)} placeholder="Hours" inputMode="numeric"
                  className="w-1/2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn disabled={busy} onClick={() => runUserAction("aura_adjust")}>Aura ±</Btn>
                <Btn disabled={busy} onClick={() => runUserAction("aura_set")}>Set Aura</Btn>
                <Btn disabled={busy} onClick={() => runUserAction("xp_adjust")}>XP ±</Btn>
                <Btn disabled={busy} onClick={() => runUserAction("xp_set")}>Set XP</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("aura_reset")}>Reset Aura</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("xp_reset")}>Reset XP</Btn>
                <Btn disabled={busy} onClick={() => patchUser({ emailVerified: true }, "verified")}>Verify ✓</Btn>
                <Btn disabled={busy} onClick={() => patchUser({ emailVerified: false }, "unverified")}>Unverify</Btn>
                <Btn disabled={busy} onClick={() => { const u = window.prompt("New username:"); if (u && u.trim().length >= 3) patchUser({ username: u.trim() }, `renamed to @${u.trim()}`); }}>Rename</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("freeze")}>Freeze</Btn>
                <Btn disabled={busy} onClick={() => runUserAction("unfreeze")}>Unfreeze</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("ban_temporary")}>Temp Ban</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("ban_permanent")}>Perm Ban</Btn>
                <Btn disabled={busy} onClick={() => runUserAction("unban")}>Unban</Btn>
                <Btn disabled={busy} danger onClick={() => runUserAction("delete_account")}>Delete Account</Btn>
              </div>
            </Panel>

            {/* Announcements */}
            <Panel title="Announcement Center">
              <input value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} placeholder="Title…"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
              <textarea value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} placeholder="Message…" rows={3}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
              <div className="mt-2 flex gap-2">
                <select value={announceAudience} onChange={(e) => setAnnounceAudience(e.target.value as any)}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-red-400/40 focus:outline-none">
                  <option value="all">Everyone</option>
                  <option value="active_7d">Active (7 days)</option>
                  <option value="restricted">Restricted users</option>
                </select>
                <Btn onClick={sendAnnouncement}>Broadcast 📣</Btn>
              </div>
              <p className="mt-2 text-[10px] text-white/35">Uses the same reason field above. Lands in every recipient&apos;s in-app inbox.</p>
            </Panel>

            {/* Creator AI Assistant */}
            <Panel title="Creator AI Assistant" badge={intelligence ? intelligence.continuousImprovement.currentVersion : "loading"} accent>
              <p className="text-xs leading-relaxed text-white/65">
                {intelligence?.assistant.platformSummary ?? "Loading platform intelligence…"}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Signal label="Suspicious" value={intelligence?.assistant.suspiciousUsers.length ?? 0} />
                <Signal label="Aura Farms" value={intelligence?.assistant.auraFarmers.length ?? 0} />
                <Signal label="Toxic Topics" value={intelligence?.assistant.toxicClusters.length ?? 0} />
                <Signal label="Exploits" value={intelligence?.assistant.exploitAttempts.length ?? 0} />
              </div>

              <IntelList title="Suspicious Users">
                {(intelligence?.assistant.suspiciousUsers ?? []).slice(0, 3).map((user) => (
                  <IntelRow key={user.id} title={`@${user.username}`} detail={user.reason} />
                ))}
              </IntelList>

              <IntelList title="Aura Farming">
                {(intelligence?.assistant.auraFarmers ?? []).slice(0, 3).map((user) => (
                  <IntelRow
                    key={user.id}
                    title={`@${user.username}`}
                    detail={`${user.auraDelta} Aura across ${user.transactions} transactions and ${user.battles} battles.`}
                  />
                ))}
              </IntelList>

              <IntelList title="Trending Topics">
                {(intelligence?.assistant.trendingTopics ?? []).slice(0, 4).map((topic) => (
                  <IntelRow key={topic.topic} title={topic.topic} detail={`${topic.battles} battles, ${topic.messages} messages`} />
                ))}
              </IntelList>

              <IntelList title="Live Strategy">
                {(intelligence?.assistant.liveStrategy ?? []).slice(0, 2).map((battle) => (
                  <IntelRow
                    key={battle.battleId}
                    title={battle.title}
                    detail={`${battle.health.healthyDebate}% ${battle.health.label}. ${battle.strategy[0]?.weakness ?? battle.directorSynthesis}`}
                  />
                ))}
              </IntelList>

              <IntelList title="Exploit Attempts">
                {(intelligence?.assistant.exploitAttempts ?? []).slice(0, 2).map((item) => (
                  <IntelRow key={item.messageId} title={`@${item.username}`} detail={item.content} />
                ))}
              </IntelList>
            </Panel>

            <Panel title="RageMind X Brain" badge={intelligence?.rageMindX.version ?? "local"} accent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Signal label="Runs 30d" value={intelligence?.rageMindX.runs30d ?? 0} />
                <Signal label="Avg Latency" value={`${intelligence?.rageMindX.averageLatencyMs ?? 0}ms`} />
                <Signal label="Confidence" value={`${intelligence?.rageMindX.averageConfidence ?? 0}%`} />
                <Signal label="Degraded" value={intelligence?.rageMindX.degradedModuleRuns ?? 0} />
              </div>

              <IntelList title="Risk Levels">
                {(intelligence?.rageMindX.riskLevels ?? []).slice(0, 3).map((risk) => (
                  <IntelRow key={risk.riskLevel} title={risk.riskLevel} detail={`${risk.count} run${risk.count === 1 ? "" : "s"}`} />
                ))}
              </IntelList>

              <IntelList title="Slowest Modules">
                {(intelligence?.rageMindX.moduleTimings ?? []).slice(0, 4).map((module) => (
                  <IntelRow
                    key={module.moduleId}
                    title={module.moduleName}
                    detail={`${module.averageMs}ms avg across ${module.runs} runs; ${module.degraded} degraded.`}
                  />
                ))}
              </IntelList>

              <IntelList title="Language Stats">
                {(intelligence?.rageMindX.languageStats ?? []).slice(0, 4).map((item) => (
                  <IntelRow key={item.language} title={item.language} detail={`${item.count} detected run${item.count === 1 ? "" : "s"}`} />
                ))}
              </IntelList>

              <IntelList title="Unknown Phrases">
                {(intelligence?.rageMindX.unknownPhrases ?? []).slice(0, 4).map((item) => (
                  <IntelRow key={item.phrase} title={item.phrase} detail={`${item.count} sighting${item.count === 1 ? "" : "s"} queued for review`} />
                ))}
              </IntelList>

              <IntelList title="Learning Queue">
                {(intelligence?.rageMindX.learningQueue ?? []).map((item) => (
                  <IntelRow key={item.status} title={item.status.replace(/_/g, " ")} detail={`${item.count} item${item.count === 1 ? "" : "s"}`} />
                ))}
              </IntelList>
            </Panel>

            {/* AI Studio */}
            <Panel title="AI Studio" badge={selfTest ? selfTest.brainVersion : "ragemind-x"} accent>
              <div className="flex items-center gap-2">
                <Btn disabled={testing} onClick={runSelfTest}>{testing ? "Testing…" : "Run Self-Test 🧪"}</Btn>
                {selfTest && (
                  <span className={`text-xs font-black ${selfTest.allPass ? "text-emerald-300" : "text-red-300"}`}>
                    {selfTest.passed}/{selfTest.passed + selfTest.failed} passed
                  </span>
                )}
              </div>
              {selfTest && (
                <div className="mt-2 space-y-1">
                  {selfTest.results.map((r) => (
                    <p key={r.name} className="text-[11px] text-white/60">
                      {r.pass ? "✓" : "✗"} {r.name}
                      {!r.pass && <span className="text-red-300"> (expected {r.expected}, got {r.got})</span>}
                    </p>
                  ))}
                </div>
              )}

              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/35">Judge Weights (live rule)</p>
              <textarea
                value={weightsDraft}
                onChange={(e) => setWeightsDraft(e.target.value)}
                rows={6}
                spellCheck={false}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/80 focus:border-red-400/40 focus:outline-none"
              />
              <Btn onClick={saveWeights}>Save Weights</Btn>

              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/35">Add Knowledge</p>
              <div className="mt-1 flex gap-2">
                <select value={kbCategory} onChange={(e) => setKbCategory(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white focus:border-red-400/40 focus:outline-none">
                  {["slang", "hinglish", "meme", "abbreviation", "emoji", "roast_template", "insult", "movies", "anime", "programming", "history", "science", "gaming", "sports", "technology", "music", "finance"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input value={kbTerm} onChange={(e) => setKbTerm(e.target.value)} placeholder="term"
                  className="w-1/3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
                <input value={kbMeaning} onChange={(e) => setKbMeaning(e.target.value)} placeholder="meaning"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-400/40 focus:outline-none" />
              </div>
              <div className="mt-2"><Btn onClick={addKnowledge}>Add to Knowledge Base</Btn></div>
              <p className="mt-2 text-[10px] text-white/35">Weight and knowledge edits use the reason field above and are audit-logged.</p>
            </Panel>

            <Panel title="Continuous Improvement" badge={`${intelligence?.continuousImprovement.modelAgreement ?? 0}% agree`}>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Signal label="Replays" value={intelligence?.continuousImprovement.historicalReplay ?? "Loading"} />
                <Signal label="Avg Confidence" value={`${intelligence?.continuousImprovement.averageConfidence ?? 0}%`} />
                <Signal label="False +" value={`${intelligence?.continuousImprovement.falsePositiveRisk ?? 0}%`} />
                <Signal label="False -" value={`${intelligence?.continuousImprovement.falseNegativeRisk ?? 0}%`} />
              </div>
              <div className="mt-3 space-y-2">
                {(intelligence?.continuousImprovement.abTests ?? []).map((test) => (
                  <IntelRow key={test.name} title={test.name} detail={`${test.status} • ${test.guardrail}`} />
                ))}
              </div>
              {intelligence?.continuousImprovement.rollback && (
                <p className="mt-3 rounded-2xl border border-white/8 bg-black/25 p-3 text-xs leading-relaxed text-white/50">
                  Rollback: {intelligence.continuousImprovement.rollback.previousVersion}. {intelligence.continuousImprovement.rollback.reason}
                </p>
              )}
            </Panel>

            <CreatorSimulationPanel />
          </aside>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, badge, accent, children }: { title: string; badge?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-[2rem] border p-4 backdrop-blur-2xl ${accent ? "border-red-400/20 bg-red-500/[0.07]" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">{title}</p>
        {badge && <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function IntelList({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items : <p className="text-xs text-white/35">No signals above threshold.</p>}
      </div>
    </div>
  );
}

function IntelRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/25 p-3 text-xs">
      <p className="font-bold text-white/75">{title}</p>
      <p className="mt-1 leading-relaxed text-white/45">{detail}</p>
    </div>
  );
}

/** Stat card that pulses with a red glow whenever its value changes. */
function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [value]);
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl transition"
      style={pulse ? { animation: "statpulse 0.9s ease" } : undefined}>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">{label}</p>
      <p className="mt-2 font-display text-2xl font-black tabular-nums text-white transition-all">{value.toLocaleString()}</p>
      <p className="mt-1 truncate text-[10px] text-white/45">{detail}</p>
    </div>
  );
}

function SkeletonCard({ tall }: { tall?: boolean }) {
  return <div className={`animate-pulse rounded-[1.5rem] border border-white/8 bg-white/[0.03] ${tall ? "h-32" : "h-24"}`} />;
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  if (!items.length || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{title}</p>
      {children}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">{label}</p>
      <p className="mt-1 truncate font-semibold text-white/80">{value}</p>
    </div>
  );
}

function Btn({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded-2xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition disabled:opacity-40 ${danger ? "border-red-400/35 bg-red-500/15 text-red-100 hover:bg-red-500/30" : "border-white/10 bg-white/[0.05] text-white/80 hover:border-red-400/30 hover:bg-red-500/10"}`}>
      {children}
    </button>
  );
}

function Chip({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${danger ? "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/30" : "border-white/12 bg-white/[0.05] text-white/70 hover:border-red-400/30 hover:bg-red-500/10"}`}>
      {children}
    </button>
  );
}
