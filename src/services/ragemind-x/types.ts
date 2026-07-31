import type { BattleSide } from "@/services/rageMind";
import type { LocalBrainResult } from "@/services/ragemind-x/local-brain/types";

export const RAGEMIND_X_VERSION = "ragemind-x-v1.1.0";

export type RageMindXStatus = "ok" | "degraded" | "skipped";
export type RageMindXRiskLevel = "low" | "medium" | "high";

export interface RageMindXModuleDefinition {
  id: string;
  name: string;
  category:
    | "controller"
    | "understanding"
    | "memory"
    | "reasoning"
    | "humor"
    | "judging"
    | "learning"
    | "security"
    | "operations"
    | "generation";
  responsibility: string;
  stage: string;
  canDegrade: boolean;
}

export interface RageMindXModuleTrace {
  id: string;
  name: string;
  category: RageMindXModuleDefinition["category"];
  stage: string;
  status: RageMindXStatus;
  durationMs: number;
  confidence: number;
  summary: string;
  signals: string[];
  error?: string;
}

export interface RageMindXArchitecture {
  controller: string;
  design: string;
  moduleCount: number;
  pipeline: string[];
  localOnly: true;
  futureAdapters: string[];
}

export interface RageMindXTimings {
  startedAt: string;
  completedAt: string;
  totalMs: number;
  moduleCount: number;
  degradedModules: string[];
}

export interface RageMindXSecurityReport {
  riskLevel: RageMindXRiskLevel;
  action: "continue" | "warn" | "quarantine";
  promptInjectionSignals: string[];
  dataPoisoningSignals: string[];
  spamSignals: string[];
  malformedInputSignals: string[];
  safetyNotes: string[];
}

export interface RageMindXMemoryReport {
  shortTermSummary: string;
  topicMemory: string[];
  battleMemory: string[];
  longTermCandidates: string[];
  repeatedPatterns: string[];
  referencedObjects: string[];
  retentionPolicy: string;
}

export interface RageMindXHumorReport {
  humorSignals: string[];
  sarcasmSignals: string[];
  ironySignals: string[];
  doubleMeanings: string[];
  roastSignals: string[];
  memeTiming: string;
  boundary: string;
}

export interface RageMindXReasoningLayers {
  literal: string;
  context: string;
  historical: string;
  pattern: string;
  conversation: string;
  humor: string;
  battle: string;
  social: string;
  strategic: string;
  self: string;
}

export interface RageMindXUserModel {
  side: BattleSide;
  skillLevel: "new" | "developing" | "skilled" | "elite";
  languagePreference: string;
  battleStyle: string;
  humorPreference: string;
  aggressionLevel: number;
  responseSpeed: string;
  adaptationNotes: string[];
}

export interface RageMindXWinnerPrediction {
  predictedWinner: BattleSide | "draw";
  scores: Record<BattleSide, number>;
  factors: string[];
  confidence: number;
}

export interface RageMindXSelfReview {
  passed: boolean;
  regeneratedInternally: boolean;
  contradictionWarnings: string[];
  hallucinationWarnings: string[];
  offensiveRiskWarnings: string[];
  improvements: string[];
}

export interface RageMindXExplainability {
  detectedIntent: string;
  detectedLanguage: string[];
  emotionAnalysis: Record<BattleSide, string[]>;
  confidenceScore: number;
  reasoningPath: string[];
  scoringBreakdown: Record<BattleSide, string[]>;
  winnerExplanation: string;
}

export interface RageMindXGenerationPlan {
  responsePlan: string[];
  candidateSummary: string;
  guardrails: string[];
}

export interface RageMindXReport {
  version: string;
  architecture: RageMindXArchitecture;
  timings: RageMindXTimings;
  modules: RageMindXModuleTrace[];
  localBrain: LocalBrainResult;
  security: RageMindXSecurityReport;
  memory: RageMindXMemoryReport;
  humor: RageMindXHumorReport;
  reasoningLayers: RageMindXReasoningLayers;
  userModels: Record<BattleSide, RageMindXUserModel>;
  winnerPrediction: RageMindXWinnerPrediction;
  selfReview: RageMindXSelfReview;
  explainability: RageMindXExplainability;
  generation: RageMindXGenerationPlan;
  unknownPhrases: string[];
}
