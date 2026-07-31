"use client";

import { useMemo } from "react";
import clsx from "clsx";
import {
  buildBattleDirectorReport,
  type BattleDirectorBattle,
  type BattleDirectorMessage,
  type BattleDirectorReport,
  type BattleDirectorSide,
  type DirectorLiveCheck,
  type DirectorReaction,
} from "@/services/battleDirector";

interface BattleDirectorPanelProps {
  battle: BattleDirectorBattle;
  messages: BattleDirectorMessage[];
  report?: BattleDirectorReport;
}

export default function BattleDirectorPanel({ battle, messages, report: providedReport }: BattleDirectorPanelProps) {
  const computedReport = useMemo(() => buildBattleDirectorReport(battle, messages), [battle, messages]);
  const report = providedReport ?? computedReport;
  const creatorWidth = `${report.prediction.creatorWinChance}%`;
  const opponentWidth = `${report.prediction.opponentWinChance}%`;
  const advanced = report.advancedSystems;

  return (
    <section className="space-y-3" aria-label="AI Battle Director">
      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-aura-purple">AI Battle Director</p>
            <h2 className="mt-1 font-display text-lg font-black">Control Tower</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/55">
            {report.statusLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/68">{report.directorLine}</p>
        <div className="mt-3 rounded-xl border border-aura-purple/25 bg-aura-purple/[0.07] px-3 py-2 text-xs font-semibold text-white/75">
          {report.nextAction}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span>Round {report.roundState.currentRound}/{report.roundState.totalRounds}</span>
            <span>{report.roundState.progress}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-aura-gradient shadow-[0_0_12px_rgba(255,30,30,0.55)]" style={{ width: `${report.roundState.progress}%` }} />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <PlayerRow state={report.creator} side="creator" />
          <PlayerRow state={report.opponent} side="opponent" />
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black">Live Referee Checks</h3>
          <span className="text-[10px] font-black uppercase tracking-wider text-white/35">{report.phase}</span>
        </div>
        <div className="mt-3 grid gap-2">
          {report.liveChecks.map((check) => (
            <LiveCheckRow key={check.label} check={check} />
          ))}
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="font-display text-sm font-black">Battle Predictor</h3>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-white/70">{battle.creator_username}</span>
          <span className="font-mono text-white/50">{report.prediction.creatorWinChance}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-aura-gradient" style={{ width: creatorWidth }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-white/70">{battle.opponent_username ?? "Opponent"}</span>
          <span className="font-mono text-white/50">{report.prediction.opponentWinChance}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-white/65" style={{ width: opponentWidth }} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          {report.prediction.confidence} confidence. {report.prediction.reason}
        </p>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black">Momentum Engine</h3>
          <span className="font-mono text-[10px] text-white/35">{advanced.version}</span>
        </div>
        <div className="mt-3 space-y-3">
          <MomentumBar label={battle.creator_username} value={advanced.momentum.creator} side="creator" />
          <MomentumBar label={battle.opponent_username ?? "Opponent"} value={advanced.momentum.opponent} side="opponent" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">{advanced.momentum.shift}</p>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black">Battle Health</h3>
          <span className="font-mono text-xs font-bold text-emerald-200">{advanced.health.healthyDebate}%</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <HealthPill label="Topic" value={advanced.health.topicRelevance} />
          <HealthPill label="Spam" value={advanced.health.spam} inverse />
          <HealthPill label="Toxicity" value={advanced.health.toxicity} inverse />
          <HealthPill label="Fun" value={advanced.health.entertainment} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">{advanced.health.label}</p>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="font-display text-sm font-black">Director Personality</h3>
        <div className="mt-3 space-y-2">
          {advanced.directorPersonality.map((event, index) => (
            <div key={`${event.tone}-${index}`} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
              <p className={clsx("text-xs leading-relaxed", event.side ? sideTextClass(event.side) : "text-white/62")}>
                {event.line}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black">AI Spectators</h3>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
            simulated
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {report.reactions.map((reaction, index) => (
            <ReactionRow key={`${reaction.type}-${index}`} reaction={reaction} />
          ))}
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="font-display text-sm font-black">Memory + Highlights</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/45">{report.memory.currentDebate}</p>
        <div className="mt-3 space-y-2">
          {report.memory.playerStyles.map((style) => (
            <p key={style} className="text-xs text-white/55">{style}</p>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
          {advanced.memoryV2.contradictions.slice(0, 2).map((event) => (
            <div key={`${event.side}-${event.round}-${event.type}`} className="text-xs">
              <p className="font-bold uppercase tracking-wider text-amber-200/75">Contradiction</p>
              <p className={clsx("mt-0.5 leading-relaxed", sideTextClass(event.side))}>{event.text}</p>
            </div>
          ))}
          {report.highlights.slice(0, 4).map((highlight) => (
            <div key={highlight.label} className="text-xs">
              <p className="font-bold uppercase tracking-wider text-white/35">{highlight.label}</p>
              <p className={clsx("mt-0.5 leading-relaxed", highlight.side ? sideTextClass(highlight.side) : "text-white/62")}>
                {highlight.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <h3 className="font-display text-sm font-black">Debate Timeline</h3>
        <div className="mt-3 space-y-2">
          {advanced.timeline.length === 0 ? (
            <p className="text-xs text-white/40">Timeline starts after the first message.</p>
          ) : (
            advanced.timeline.slice(0, 6).map((event) => (
              <div key={`${event.at}-${event.label}`} className="grid grid-cols-[44px_1fr] gap-2 border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
                <span className="font-mono text-[10px] text-white/35">{event.at}</span>
                <div>
                  <p className={clsx("text-xs font-bold", event.side ? sideTextClass(event.side) : "text-white/68")}>{event.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{event.detail}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MomentumBar({ label, value, side }: { label: string; value: number; side: BattleDirectorSide }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className={clsx("truncate font-semibold", sideTextClass(side))}>{label}</span>
        <span className="font-mono text-white/45">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={clsx("h-full rounded-full", side === "creator" ? "bg-aura-gradient" : "bg-white/65")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function HealthPill({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value <= 20 : value >= 70;
  const watch = inverse ? value <= 45 : value >= 50;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</span>
        <span className={clsx("font-mono text-xs font-bold", good ? "text-emerald-200" : watch ? "text-amber-200" : "text-aura-purple")}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function PlayerRow({
  state,
  side,
}: {
  state: BattleDirectorReport["creator"];
  side: BattleDirectorSide;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx("truncate text-xs font-black", sideTextClass(side))}>{state.username}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">
            {state.posts} posted · {state.remaining} left · {state.stance}
          </p>
        </div>
        <div className="text-right font-mono text-[10px] text-white/45">
          <p>{state.topicFit}% topic</p>
          <p>{state.pressure}% pressure</p>
        </div>
      </div>
      {state.warnings.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300/85">{state.warnings[0]}</p>
      )}
    </div>
  );
}

function LiveCheckRow({ check }: { check: DirectorLiveCheck }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
      <div>
        <p className="text-xs font-bold text-white/70">{check.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{check.detail}</p>
      </div>
      <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", toneClass(check.tone))}>
        {check.value}
      </span>
    </div>
  );
}

function ReactionRow({ reaction }: { reaction: DirectorReaction }) {
  return (
    <div className="border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-white/35">{reaction.label}</span>
        <span className={clsx("text-[10px] font-bold uppercase tracking-wider", reaction.side ? sideTextClass(reaction.side) : "text-white/35")}>
          {reaction.type}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/58">{reaction.line}</p>
    </div>
  );
}

function toneClass(tone: DirectorLiveCheck["tone"]) {
  if (tone === "good") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (tone === "watch") return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  if (tone === "alert") return "border-aura-purple/35 bg-aura-purple/10 text-aura-purple";
  return "border-white/10 bg-white/[0.04] text-white/45";
}

function sideTextClass(side: BattleDirectorSide) {
  return side === "creator" ? "text-aura-purple" : "text-white/75";
}
