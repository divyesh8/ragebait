import { sql } from "@/lib/db";
import { RAGEMIND_X_VERSION, type RageMindXReport } from "@/services/ragemind-x/types";
import type { RageMindInput } from "@/services/rageMind";

export interface RageMindXCreatorTelemetry {
  version: string;
  runs30d: number;
  averageLatencyMs: number;
  averageConfidence: number;
  degradedModuleRuns: number;
  localBrain: {
    runs30d: number;
    averageLatencyMs: number;
    averageConfidence: number;
    averageMemoryHits: number;
    adapters: { adapterId: string; count: number }[];
    recentCriticCorrections: string[];
  };
  riskLevels: { riskLevel: string; count: number }[];
  moduleTimings: { moduleId: string; moduleName: string; averageMs: number; degraded: number; runs: number }[];
  confidenceTrend: { day: string; averageConfidence: number; runs: number }[];
  languageStats: { language: string; count: number }[];
  unknownPhrases: { phrase: string; count: number }[];
  learningQueue: { status: string; count: number }[];
}

export async function recordRageMindXRun(input: RageMindInput, transcriptHash: string, brain: RageMindXReport) {
  if (!input.battleId) return;

  try {
    const runRows = await sql`
      INSERT INTO ragemind_x_runs (
        battle_id, transcript_hash, version, source, primary_intent, primary_languages,
        confidence, risk_level, winner_prediction, total_ms, module_count,
        degraded_modules, explainability
      ) VALUES (
        ${input.battleId}, ${transcriptHash}, ${brain.version}, 'local',
        ${brain.explainability.detectedIntent},
        ${JSON.stringify(brain.explainability.detectedLanguage)},
        ${brain.explainability.confidenceScore},
        ${brain.security.riskLevel},
        ${brain.winnerPrediction.predictedWinner},
        ${brain.timings.totalMs},
        ${brain.timings.moduleCount},
        ${JSON.stringify(brain.timings.degradedModules)},
        ${JSON.stringify(brain.explainability)}
      )
      ON CONFLICT (battle_id, transcript_hash) DO UPDATE SET
        version = EXCLUDED.version,
        source = EXCLUDED.source,
        primary_intent = EXCLUDED.primary_intent,
        primary_languages = EXCLUDED.primary_languages,
        confidence = EXCLUDED.confidence,
        risk_level = EXCLUDED.risk_level,
        winner_prediction = EXCLUDED.winner_prediction,
        total_ms = EXCLUDED.total_ms,
        module_count = EXCLUDED.module_count,
        degraded_modules = EXCLUDED.degraded_modules,
        explainability = EXCLUDED.explainability,
        created_at = now()
      RETURNING id
    `;

    const runId = runRows[0]?.id;
    if (!runId) return;

    await sql`DELETE FROM ragemind_x_module_logs WHERE run_id = ${runId}`;
    for (const trace of brain.modules) {
      await sql`
        INSERT INTO ragemind_x_module_logs (
          run_id, module_id, module_name, category, stage, status, duration_ms,
          confidence, summary, signals
        ) VALUES (
          ${runId}, ${trace.id}, ${trace.name}, ${trace.category}, ${trace.stage},
          ${trace.status}, ${trace.durationMs}, ${trace.confidence},
          ${trace.summary}, ${JSON.stringify(trace.signals)}
        )
      `;
    }

    for (const phrase of brain.unknownPhrases.slice(0, 8)) {
      await sql`
        INSERT INTO ragemind_x_unknown_phrases (phrase, first_battle_id, count, last_seen_at)
        VALUES (${phrase}, ${input.battleId}, 1, now())
        ON CONFLICT (phrase) DO UPDATE SET
          count = ragemind_x_unknown_phrases.count + 1,
          last_seen_at = now()
      `;
    }

    if (brain.memory.longTermCandidates.length > 0) {
      await sql`
        INSERT INTO ragemind_x_learning_queue (
          battle_id, transcript_hash, status, quality_score, extracted_patterns, rejection_reason
        ) VALUES (
          ${input.battleId}, ${transcriptHash}, 'pending_review',
          ${brain.explainability.confidenceScore},
          ${JSON.stringify(brain.memory.longTermCandidates)},
          NULL
        )
        ON CONFLICT (battle_id, transcript_hash) DO UPDATE SET
          quality_score = EXCLUDED.quality_score,
          extracted_patterns = EXCLUDED.extracted_patterns,
          status = 'pending_review',
          updated_at = now()
      `;
    }

    await recordLocalBrainRun(input, transcriptHash, brain);
  } catch (err) {
    console.warn("RageMind X telemetry write skipped:", err);
  }
}

export async function readRageMindXCreatorTelemetry(): Promise<RageMindXCreatorTelemetry> {
  try {
    const [summary, riskLevels, moduleTimings, confidenceTrend, languageStats, unknownPhrases, learningQueue, localBrain] =
      await Promise.all([
        sql`
          SELECT COUNT(*)::int AS runs,
                 COALESCE(ROUND(AVG(total_ms))::int, 0) AS average_latency_ms,
                 COALESCE(ROUND(AVG(confidence))::int, 0) AS average_confidence,
                 COUNT(*) FILTER (WHERE jsonb_array_length(degraded_modules) > 0)::int AS degraded_module_runs
          FROM ragemind_x_runs
          WHERE created_at > now() - interval '30 days'
        `,
        sql`
          SELECT risk_level, COUNT(*)::int AS count
          FROM ragemind_x_runs
          WHERE created_at > now() - interval '30 days'
          GROUP BY risk_level
          ORDER BY count DESC
        `,
        sql`
          SELECT module_id, module_name,
                 COALESCE(ROUND(AVG(duration_ms))::int, 0) AS average_ms,
                 COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
                 COUNT(*)::int AS runs
          FROM ragemind_x_module_logs
          WHERE created_at > now() - interval '30 days'
          GROUP BY module_id, module_name
          ORDER BY average_ms DESC, runs DESC
          LIMIT 8
        `,
        sql`
          SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                 COALESCE(ROUND(AVG(confidence))::int, 0) AS average_confidence,
                 COUNT(*)::int AS runs
          FROM ragemind_x_runs
          WHERE created_at > now() - interval '14 days'
          GROUP BY date_trunc('day', created_at)
          ORDER BY day ASC
        `,
        sql`
          SELECT language, COUNT(*)::int AS count
          FROM ragemind_x_runs,
               LATERAL jsonb_array_elements_text(primary_languages) AS language
          WHERE created_at > now() - interval '30 days'
          GROUP BY language
          ORDER BY count DESC, language ASC
          LIMIT 8
        `,
        sql`
          SELECT phrase, count::int
          FROM ragemind_x_unknown_phrases
          ORDER BY last_seen_at DESC, count DESC
          LIMIT 8
        `,
        sql`
          SELECT status, COUNT(*)::int AS count
          FROM ragemind_x_learning_queue
          GROUP BY status
          ORDER BY status
        `,
        readLocalBrainTelemetry(),
      ]);

    return {
      version: RAGEMIND_X_VERSION,
      runs30d: Number(summary[0]?.runs ?? 0),
      averageLatencyMs: Number(summary[0]?.average_latency_ms ?? 0),
      averageConfidence: Number(summary[0]?.average_confidence ?? 0),
      degradedModuleRuns: Number(summary[0]?.degraded_module_runs ?? 0),
      localBrain,
      riskLevels: riskLevels.map((row) => ({ riskLevel: String(row.risk_level), count: Number(row.count ?? 0) })),
      moduleTimings: moduleTimings.map((row) => ({
        moduleId: String(row.module_id),
        moduleName: String(row.module_name),
        averageMs: Number(row.average_ms ?? 0),
        degraded: Number(row.degraded ?? 0),
        runs: Number(row.runs ?? 0),
      })),
      confidenceTrend: confidenceTrend.map((row) => ({
        day: String(row.day),
        averageConfidence: Number(row.average_confidence ?? 0),
        runs: Number(row.runs ?? 0),
      })),
      languageStats: languageStats.map((row) => ({ language: String(row.language), count: Number(row.count ?? 0) })),
      unknownPhrases: unknownPhrases.map((row) => ({ phrase: String(row.phrase), count: Number(row.count ?? 0) })),
      learningQueue: learningQueue.map((row) => ({ status: String(row.status), count: Number(row.count ?? 0) })),
    };
  } catch {
    return {
      version: RAGEMIND_X_VERSION,
      runs30d: 0,
      averageLatencyMs: 0,
      averageConfidence: 0,
      degradedModuleRuns: 0,
      localBrain: emptyLocalBrainTelemetry(),
      riskLevels: [],
      moduleTimings: [],
      confidenceTrend: [],
      languageStats: [],
      unknownPhrases: [],
      learningQueue: [],
    };
  }
}

async function recordLocalBrainRun(input: RageMindInput, transcriptHash: string, brain: RageMindXReport) {
  if (!brain.localBrain) return;
  try {
    const local = brain.localBrain;
    await sql`
      INSERT INTO ragemind_x_brain_runs (
        battle_id, conversation_id, transcript_hash, brain_version, adapter_id,
        language_summary, embedding_stats, retrieval, reasoning_graph, response_plan,
        critic_report, safety_report, confidence, latency_ms, token_count,
        memory_hits, knowledge_hits, critic_corrections
      ) VALUES (
        ${input.battleId ?? null},
        ${local.input.conversationId ?? input.battleId ?? null},
        ${transcriptHash},
        ${local.version},
        ${local.model.id},
        ${JSON.stringify(local.nlp.languages)},
        ${JSON.stringify(local.embeddings.statistics)},
        ${JSON.stringify(local.retrieval)},
        ${JSON.stringify(local.reasoning.graph)},
        ${JSON.stringify(local.response.plan)},
        ${JSON.stringify(local.response.critic)},
        ${JSON.stringify(local.safety)},
        ${local.observability.confidence},
        ${local.observability.latencyMs},
        ${local.observability.tokenStatistics.totalTokens},
        ${local.observability.memoryHits},
        ${local.retrieval.evidence.length},
        ${JSON.stringify(local.response.critic.corrections)}
      )
      ON CONFLICT (transcript_hash, brain_version) DO UPDATE SET
        adapter_id = EXCLUDED.adapter_id,
        language_summary = EXCLUDED.language_summary,
        embedding_stats = EXCLUDED.embedding_stats,
        retrieval = EXCLUDED.retrieval,
        reasoning_graph = EXCLUDED.reasoning_graph,
        response_plan = EXCLUDED.response_plan,
        critic_report = EXCLUDED.critic_report,
        safety_report = EXCLUDED.safety_report,
        confidence = EXCLUDED.confidence,
        latency_ms = EXCLUDED.latency_ms,
        token_count = EXCLUDED.token_count,
        memory_hits = EXCLUDED.memory_hits,
        knowledge_hits = EXCLUDED.knowledge_hits,
        critic_corrections = EXCLUDED.critic_corrections,
        created_at = now()
    `;
  } catch (err) {
    console.warn("RageMind X local brain telemetry skipped:", err);
  }
}

export async function readLocalBrainTelemetry(): Promise<RageMindXCreatorTelemetry["localBrain"]> {
  try {
    const [summary, adapters, corrections] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS runs,
               COALESCE(ROUND(AVG(latency_ms))::int, 0) AS average_latency_ms,
               COALESCE(ROUND(AVG(confidence))::int, 0) AS average_confidence,
               COALESCE(ROUND(AVG(memory_hits), 1), 0) AS average_memory_hits
        FROM ragemind_x_brain_runs
        WHERE created_at > now() - interval '30 days'
      `,
      sql`
        SELECT adapter_id, COUNT(*)::int AS count
        FROM ragemind_x_brain_runs
        WHERE created_at > now() - interval '30 days'
        GROUP BY adapter_id
        ORDER BY count DESC
        LIMIT 6
      `,
      sql`
        SELECT correction
        FROM ragemind_x_brain_runs,
             LATERAL jsonb_array_elements_text(critic_corrections) AS correction
        WHERE created_at > now() - interval '14 days'
        ORDER BY created_at DESC
        LIMIT 10
      `,
    ]);
    return {
      runs30d: Number(summary[0]?.runs ?? 0),
      averageLatencyMs: Number(summary[0]?.average_latency_ms ?? 0),
      averageConfidence: Number(summary[0]?.average_confidence ?? 0),
      averageMemoryHits: Number(summary[0]?.average_memory_hits ?? 0),
      adapters: adapters.map((row) => ({ adapterId: String(row.adapter_id), count: Number(row.count ?? 0) })),
      recentCriticCorrections: corrections.map((row) => String(row.correction)),
    };
  } catch {
    return emptyLocalBrainTelemetry();
  }
}

function emptyLocalBrainTelemetry(): RageMindXCreatorTelemetry["localBrain"] {
  return {
    runs30d: 0,
    averageLatencyMs: 0,
    averageConfidence: 0,
    averageMemoryHits: 0,
    adapters: [],
    recentCriticCorrections: [],
  };
}
