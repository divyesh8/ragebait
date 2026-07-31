import { sql } from "@/lib/db";
import { updatePlayerMemory } from "@/services/memoryEngine";
import { runRageMindX } from "@/services/ragemind-x/controller";
import { recordRageMindXRun } from "@/services/ragemind-x/telemetry";
import { RAGEMIND_X_VERSION, type RageMindXReport } from "@/services/ragemind-x/types";
import type { LanguageAnalysis } from "@/services/languageEngine";
import type { SlangAnalysis } from "@/services/slangEngine";
import type { MemeAnalysis } from "@/services/memeEngine";
import type { EmotionAnalysis } from "@/services/emotionEngine";
import type { PersonalityAnalysis } from "@/services/personalityEngine";
import type { PsychologyAnalysis } from "@/services/psychologyEngine";
import type { AudienceSimulation } from "@/services/audienceEngine";
import type { ReasoningAnalysis } from "@/services/reasoningEngine";
import type { BattleDNA } from "@/services/battleDNA";
import type { PlayerDNAResult } from "@/services/playerDNA";

export type BattleSide = "creator" | "opponent";

export interface RageMindMessage {
  side: BattleSide;
  userId: string;
  username: string;
  content: string;
  round: number;
  createdAt?: string;
}

export interface RageMindPlayer {
  side: BattleSide;
  userId: string;
  username: string;
}

export interface RageMindInput {
  battleId?: string;
  title: string;
  topic: string;
  battleType?: string;
  mode?: string;
  players: RageMindPlayer[];
  messages: RageMindMessage[];
}

export interface RageMindReport {
  transcriptHash: string;
  battleStyle: string;
  languageUnderstanding: LanguageAnalysis;
  slangEngine: SlangAnalysis;
  memeEngine: MemeAnalysis;
  emotionEngine: EmotionAnalysis;
  personalityEngine: PersonalityAnalysis;
  contextEngine: {
    conversationFlow: string;
    momentumShifts: string[];
    hiddenIntentions: string[];
    doubleMeanings: string[];
    sarcasmSignals: string[];
  };
  psychologyEngine: PsychologyAnalysis;
  audienceSimulation: AudienceSimulation;
  reasoningEngine: ReasoningAnalysis;
  battleDNA: BattleDNA;
  playerDNA: PlayerDNAResult;
  fairnessEngine: {
    biasWarnings: string[];
    judgingGuidance: string;
  };
  confidence: {
    score: number;
    reasoning: string;
    alternativeInterpretation?: string;
  };
  memorySignals: Record<BattleSide, string[]>;
  brain: RageMindXReport;
  source: "local" | "fallback";
}

export async function analyzeWithRageMind(input: RageMindInput): Promise<RageMindReport> {
  const transcriptHash = await hashTranscript(input);
  const cached = input.battleId ? await readCachedReport(input.battleId, transcriptHash) : null;
  if (cached?.brain?.version === RAGEMIND_X_VERSION) return cached;

  const execution = await runRageMindX(input);
  const report: RageMindReport = {
    transcriptHash,
    ...execution.parts,
    brain: execution.brain,
    source: "local",
  };

  if (input.battleId) {
    await Promise.all([
      cacheReport(input.battleId, transcriptHash, report),
      recordRageMindXRun(input, transcriptHash, report.brain),
    ]);
  }

  return report;
}

export async function updateRageMindMemory(input: RageMindInput, report: RageMindReport) {
  await updatePlayerMemory(input, report);
}

async function readCachedReport(battleId: string, transcriptHash: string): Promise<RageMindReport | null> {
  try {
    const rows = await sql`
      SELECT payload FROM rage_mind_analysis_cache
      WHERE battle_id = ${battleId} AND transcript_hash = ${transcriptHash}
        AND expires_at > now()
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

async function cacheReport(battleId: string, transcriptHash: string, report: RageMindReport) {
  try {
    await sql`
      INSERT INTO rage_mind_analysis_cache (battle_id, transcript_hash, payload, expires_at)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, now() + interval '14 days')
      ON CONFLICT (battle_id, transcript_hash) DO UPDATE SET
        payload = EXCLUDED.payload,
        generated_at = now(),
        expires_at = EXCLUDED.expires_at
    `;

    await sql`
      INSERT INTO battle_ragemind_reports (battle_id, transcript_hash, payload, battle_dna)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, ${JSON.stringify(report.battleDNA)})
      ON CONFLICT (battle_id) DO UPDATE SET
        transcript_hash = EXCLUDED.transcript_hash,
        payload = EXCLUDED.payload,
        battle_dna = EXCLUDED.battle_dna,
        generated_at = now()
    `;

    await sql`
      INSERT INTO battle_dna_snapshots (battle_id, dna)
      VALUES (${battleId}, ${JSON.stringify(report.battleDNA)})
      ON CONFLICT (battle_id) DO UPDATE SET
        dna = EXCLUDED.dna,
        generated_at = now()
    `;
  } catch (err) {
    console.warn("RageMind X cache write skipped:", err);
  }
}

async function hashTranscript(input: RageMindInput): Promise<string> {
  const data = JSON.stringify({
    title: input.title,
    topic: input.topic,
    battleType: input.battleType,
    mode: input.mode,
    messages: input.messages.map((message) => [message.side, message.userId, message.round, message.content]),
  });

  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(data);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${data.length}:${data.slice(0, 120)}`;
}
