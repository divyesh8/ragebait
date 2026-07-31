"use client";

import { useCallback, useEffect, useState } from "react";

type SimulationOverview = {
  settings: {
    status: "running" | "paused" | "stopped";
    hourly_min: number;
    hourly_max: number;
    max_concurrent: number;
    latest_tick_at: string | null;
    next_tick_at: string | null;
  } | null;
  totals: {
    total?: number;
    today?: number;
    scheduled?: number;
    running?: number;
    failed?: number;
    needs_review?: number;
    ai_self_play?: number;
    average_battle_length?: number;
    average_ai_score?: number;
    confidence_score?: number;
    judge_agreement_pct?: number;
  };
  recent: {
    id: string;
    topic: string;
    category: string;
    language_mode: string;
    status: string;
    winner_name: string | null;
    summary: string | null;
    error: string | null;
  }[];
  languages: { language_mode: string; count: number }[];
  categories: { category: string; count: number }[];
  failures: { id: string; event_type: string; error: string; created_at: string }[];
  training?: {
    battleType: "AI_SELF_PLAY";
    visibility: "CREATOR_ONLY";
    hiddenFromPlayers: boolean;
    usedForTraining: boolean;
    languagesTrained: number;
    trainingProgress: number;
    confidenceScore: number;
    judgeAgreementPct: number;
    reviewQueue: {
      id: string;
      simulation_battle_id: string;
      reason: string;
      disagreement_score: number;
      topic: string;
      language_mode: string;
      difficulty: string;
      created_at: string;
    }[];
    biasReports: { id: string; topic: string; warnings: string[]; language: string }[];
    unknownSlang: { value: string; count: number }[];
    unknownWords: { value: string; count: number }[];
    newPhrasesLearned: { value: string; count: number }[];
    mostDifficultBattles: { id: string; topic: string; language: string; difficulty: string; disagreementScore: number }[];
    mostCommonMistakes: { mistake: string; count: number }[];
    reasoningLogs: { battleId: string; topic: string; entry: string }[];
  };
};

export default function CreatorSimulationPanel() {
  const [overview, setOverview] = useState<SimulationOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hourlyMin, setHourlyMin] = useState("5");
  const [hourlyMax, setHourlyMax] = useState("10");
  const [maxConcurrent, setMaxConcurrent] = useState("2");

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/simulations", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setOverview(data);
    if (data.settings) {
      setHourlyMin(String(data.settings.hourly_min ?? 5));
      setHourlyMax(String(data.settings.hourly_max ?? 10));
      setMaxConcurrent(String(data.settings.max_concurrent ?? 2));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function patchSettings(status?: "running" | "paused" | "stopped") {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/creator/simulations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          hourlyMin: Number(hourlyMin),
          hourlyMax: Number(hourlyMax),
          maxConcurrent: Number(maxConcurrent),
          reason: "Creator simulation control",
        }),
      });
      const data = await res.json();
      setFeedback(res.ok ? "Simulation settings saved." : data.error ?? "Could not save settings.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "tick" | "manual_generate") {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/creator/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, count: 1, reason: "Creator simulation action" }),
      });
      const data = await res.json();
      setFeedback(res.ok ? (action === "tick" ? "Scheduler tick complete." : "Manual simulation generated.") : data.error ?? "Simulation action failed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteSimulation(id: string) {
    if (!window.confirm("Delete this simulation log?")) return;
    setBusy(true);
    try {
      await fetch(`/api/creator/simulations/${id}?reason=${encodeURIComponent("Creator deleted simulation")}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const settings = overview?.settings;
  const totals = overview?.totals ?? {};
  const training = overview?.training;

  return (
    <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.07] p-4 backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">AI Training Dashboard</p>
          <h3 className="mt-1 font-display text-xl font-black">Internal Self-Play</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
          settings?.status === "running"
            ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
            : "border-white/10 bg-white/[0.04] text-white/45"
        }`}>
          {settings?.status ?? "loading"}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Meta label="Type" value={training?.battleType ?? "AI_SELF_PLAY"} />
        <Meta label="Visibility" value={training?.visibility ?? "CREATOR_ONLY"} />
        <Meta label="Hidden" value={training?.hiddenFromPlayers !== false ? "true" : "false"} />
        <Meta label="Training" value={training?.usedForTraining !== false ? "true" : "false"} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Signal label="AI Battles" value={totals.ai_self_play ?? totals.total ?? 0} />
        <Signal label="Today" value={totals.today ?? 0} />
        <Signal label="Review" value={totals.needs_review ?? 0} />
        <Signal label="Confidence" value={`${training?.confidenceScore ?? totals.confidence_score ?? 0}%`} />
        <Signal label="Agreement" value={`${training?.judgeAgreementPct ?? totals.judge_agreement_pct ?? 0}%`} />
        <Signal label="Languages" value={training?.languagesTrained ?? overview?.languages?.length ?? 0} />
        <Signal label="Scheduled" value={totals.scheduled ?? 0} />
        <Signal label="Failed" value={totals.failed ?? 0} />
        <Signal label="Progress" value={`${training?.trainingProgress ?? 0}%`} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <input value={hourlyMin} onChange={(e) => setHourlyMin(e.target.value)} inputMode="numeric" className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" aria-label="Hourly minimum" />
        <input value={hourlyMax} onChange={(e) => setHourlyMax(e.target.value)} inputMode="numeric" className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" aria-label="Hourly maximum" />
        <input value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} inputMode="numeric" className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" aria-label="Max concurrent" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn disabled={busy} onClick={() => patchSettings("running")}>Start / Resume</Btn>
        <Btn disabled={busy} onClick={() => patchSettings("paused")}>Pause</Btn>
        <Btn disabled={busy} onClick={() => patchSettings("stopped")}>Stop</Btn>
        <Btn disabled={busy} onClick={() => patchSettings()}>Save Limits</Btn>
        <Btn disabled={busy} onClick={() => runAction("tick")}>Run Tick</Btn>
        <Btn disabled={busy} onClick={() => runAction("manual_generate")}>Manual Generate</Btn>
      </div>

      <a
        href="/api/creator/simulations/export"
        className="mt-3 block rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white/70 hover:border-red-400/30 hover:bg-red-500/10"
      >
        Export Logs
      </a>

      {feedback && <p className="mt-3 text-xs font-semibold text-red-100">{feedback}</p>}

      <div className="mt-4 grid gap-3">
        <TrainingList title="Needs Review Queue">
          {(training?.reviewQueue ?? []).slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-bold">{item.topic}</p>
                <span className="shrink-0 rounded-full border border-red-300/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-black text-red-100">
                  {item.disagreement_score}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-white/45">{item.language_mode} / {item.difficulty}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-white/55">{item.reason}</p>
            </div>
          ))}
        </TrainingList>

        <TrainingList title="Unknown Slang">
          <ChipCloud items={training?.unknownSlang ?? []} />
        </TrainingList>

        <TrainingList title="Unknown Words">
          <ChipCloud items={training?.unknownWords ?? []} />
        </TrainingList>

        <TrainingList title="New Phrases Learned">
          <ChipCloud items={training?.newPhrasesLearned ?? []} />
        </TrainingList>

        <TrainingList title="Bias Reports">
          {(training?.biasReports ?? []).slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-black/25 p-3 text-xs">
              <p className="font-bold text-white/75">{item.topic}</p>
              <p className="mt-1 text-white/45">{item.language}: {item.warnings.join(", ")}</p>
            </div>
          ))}
        </TrainingList>

        <TrainingList title="Most Difficult Battles">
          {(training?.mostDifficultBattles ?? []).slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-black/25 p-3 text-xs">
              <p className="truncate font-bold text-white/75">{item.topic}</p>
              <p className="mt-1 text-white/45">{item.language} / {item.difficulty} / disagreement {item.disagreementScore}</p>
            </div>
          ))}
        </TrainingList>

        <TrainingList title="Most Common Mistakes">
          <ChipCloud items={(training?.mostCommonMistakes ?? []).map((item) => ({ value: item.mistake, count: item.count }))} />
        </TrainingList>

        <TrainingList title="Reasoning Logs">
          {(training?.reasoningLogs ?? []).slice(0, 4).map((item) => (
            <div key={`${item.battleId}-${item.entry}`} className="rounded-2xl border border-white/8 bg-black/25 p-3 text-xs">
              <p className="truncate font-bold text-white/75">{item.topic}</p>
              <p className="mt-1 line-clamp-2 text-white/45">{item.entry}</p>
            </div>
          ))}
        </TrainingList>
      </div>

      <div className="mt-4 space-y-2">
        {(overview?.recent ?? []).slice(0, 4).map((sim) => (
          <div key={sim.id} className="rounded-2xl border border-white/8 bg-black/25 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{sim.topic}</p>
                <p className="text-[10px] text-white/38">{sim.language_mode} / {sim.category} / {sim.status}</p>
              </div>
              <button onClick={() => deleteSimulation(sim.id)} disabled={busy} className="text-[10px] font-black uppercase text-red-200 hover:text-white">
                Delete
              </button>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] text-white/45">{sim.error || sim.summary || "Waiting for run."}</p>
          </div>
        ))}
      </div>

      {(overview?.failures ?? []).length > 0 && (
        <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
          Latest error: {overview?.failures[0]?.error}
        </p>
      )}
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-black text-white">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-red-300/15 bg-red-400/[0.06] px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-red-100/45">{label}</p>
      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-red-100">{value}</p>
    </div>
  );
}

function TrainingList({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="border-t border-white/8 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items : <p className="text-xs text-white/35">No signals above threshold.</p>}
      </div>
    </div>
  );
}

function ChipCloud({ items }: { items: { value: string; count: number }[] }) {
  if (!items.length) return <p className="text-xs text-white/35">No signals above threshold.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 12).map((item) => (
        <span key={item.value} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/55">
          {item.value} {item.count > 1 ? `x${item.count}` : ""}
        </span>
      ))}
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/80 transition hover:border-red-400/30 hover:bg-red-500/10 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
