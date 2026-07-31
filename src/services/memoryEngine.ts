import { sql } from "@/lib/db";
import type { BattleSide, RageMindInput, RageMindPlayer, RageMindReport } from "@/services/rageMind";

interface PlayerMemoryDNA {
  humorStyle: string;
  argumentStructure: string;
  growthSignal: string;
  aggression: number;
  confidence: number;
  culturalDensity: number;
  strongestSignals: string[];
}

export async function updatePlayerMemory(input: RageMindInput, report: RageMindReport) {
  if (!input.battleId) return;

  try {
    for (const player of input.players) {
      const dna = buildPlayerMemoryDNA(input, report, player);
      const successfulLines = [
        report.audienceSimulation.biggestLaugh,
        report.audienceSimulation.mostSavageComeback,
        report.audienceSimulation.mostShareableLine,
      ].filter((line) => line.toLowerCase().includes(player.username.toLowerCase()));
      const recurringMistakes = report.contextEngine.momentumShifts
        .filter((signal) => /repeat|weak|miss|not enough|generic/i.test(signal))
        .slice(0, 4);

      await sql`
        INSERT INTO player_ragemind_memories (
          user_id, personality_traits, emotional_patterns, favorite_jokes, successful_strategies,
          recurring_mistakes, cultural_signals, favorite_topics, best_comeback, favorite_humor_style,
          typical_argument_structure, growth_timeline, player_dna, updated_at
        ) VALUES (
          ${player.userId},
          ${JSON.stringify(report.personalityEngine[player.side] ?? [])},
          ${JSON.stringify(report.emotionEngine[player.side] ?? [])},
          ${JSON.stringify(successfulLines)},
          ${JSON.stringify(report.memorySignals[player.side] ?? [])},
          ${JSON.stringify(recurringMistakes)},
          ${JSON.stringify(report.languageUnderstanding.notes)},
          ${JSON.stringify([input.topic])},
          ${report.audienceSimulation.mostSavageComeback},
          ${dna.humorStyle},
          ${dna.argumentStructure},
          ${JSON.stringify([`${new Date().toISOString()}: ${dna.growthSignal}`])},
          ${JSON.stringify(dna)},
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          personality_traits = merge_jsonb_arrays(player_ragemind_memories.personality_traits, EXCLUDED.personality_traits),
          emotional_patterns = merge_jsonb_arrays(player_ragemind_memories.emotional_patterns, EXCLUDED.emotional_patterns),
          favorite_jokes = merge_jsonb_arrays(player_ragemind_memories.favorite_jokes, EXCLUDED.favorite_jokes),
          successful_strategies = merge_jsonb_arrays(player_ragemind_memories.successful_strategies, EXCLUDED.successful_strategies),
          recurring_mistakes = merge_jsonb_arrays(player_ragemind_memories.recurring_mistakes, EXCLUDED.recurring_mistakes),
          cultural_signals = merge_jsonb_arrays(player_ragemind_memories.cultural_signals, EXCLUDED.cultural_signals),
          favorite_topics = merge_jsonb_arrays(player_ragemind_memories.favorite_topics, EXCLUDED.favorite_topics),
          best_comeback = COALESCE(NULLIF(EXCLUDED.best_comeback, ''), player_ragemind_memories.best_comeback),
          favorite_humor_style = COALESCE(NULLIF(EXCLUDED.favorite_humor_style, ''), player_ragemind_memories.favorite_humor_style),
          typical_argument_structure = COALESCE(NULLIF(EXCLUDED.typical_argument_structure, ''), player_ragemind_memories.typical_argument_structure),
          growth_timeline = merge_jsonb_arrays(player_ragemind_memories.growth_timeline, EXCLUDED.growth_timeline),
          player_dna = EXCLUDED.player_dna,
          updated_at = now()
      `;

      await sql`
        INSERT INTO player_dna_snapshots (user_id, dna)
        VALUES (${player.userId}, ${JSON.stringify(dna)})
        ON CONFLICT (user_id) DO UPDATE SET
          dna = EXCLUDED.dna,
          updated_at = now()
      `;
    }
  } catch (err) {
    console.warn("RageMind X memory update skipped:", err);
  }
}

function buildPlayerMemoryDNA(input: RageMindInput, report: RageMindReport, player: RageMindPlayer): PlayerMemoryDNA {
  const messages = input.messages.filter((message) => message.side === player.side);
  const text = messages.map((message) => message.content).join(" ");
  const lower = text.toLowerCase();
  const personalities = report.personalityEngine[player.side] ?? [];
  const emotions = report.emotionEngine[player.side] ?? [];
  const memorySignals = report.memorySignals[player.side] ?? [];

  return {
    humorStyle: inferHumorStyle(lower, personalities),
    argumentStructure: inferArgumentStructure(lower),
    growthSignal: inferGrowthSignal(player.side, report, messages.length),
    aggression: clamp(35 + hits(text, /\b(destroy|dead|trash|cooked|ratio|sit down|cope)\b/gi) * 8),
    confidence: clamp(42 + hits(text, /\b(clearly|obvious|easy|watch|no cap|trust me)\b/gi) * 8),
    culturalDensity: clamp(20 + report.slangEngine.detected.length * 6 + report.memeEngine.references.length * 8),
    strongestSignals: [...personalities, ...emotions, ...memorySignals].slice(0, 8),
  };
}

function inferHumorStyle(text: string, personalities: string[]) {
  if (/\b(lol|haha|meme|bro|wild|ratio)\b/i.test(text)) return "meme-driven";
  if (/\b(because|logic|point|evidence)\b/i.test(text)) return "analytical";
  if (personalities.some((item) => /aggressive/i.test(item))) return "aggressive roast";
  if (personalities.some((item) => /funny/i.test(item))) return "punchline focused";
  return "balanced";
}

function inferArgumentStructure(text: string) {
  if (/\b(because|therefore|evidence|reason)\b/i.test(text)) return "setup, reason, conclusion";
  if (/\b(but|actually|you said|still)\b/i.test(text)) return "rebuttal first";
  if (text.length < 80) return "short punchlines";
  return "extended riff";
}

function inferGrowthSignal(side: BattleSide, report: RageMindReport, messageCount: number) {
  const signals = report.memorySignals[side] ?? [];
  if (signals.length) return signals[0];
  if (messageCount <= 1) return "Needs more battle history for a reliable growth read.";
  return "Shows enough activity to compare timing, originality, and adaptation next battle.";
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
