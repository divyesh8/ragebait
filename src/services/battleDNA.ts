import type { RageMindInput, RageMindReport } from "@/services/rageMind";

export interface BattleDNA {
  humor: number;
  logic: number;
  creativity: number;
  originality: number;
  aggression: number;
  confidence: number;
  audienceAppeal: number;
  emotionalIntensity: number;
  culturalDensity: number;
}

export function generateBattleDNA(input: RageMindInput, report: Pick<RageMindReport, "slangEngine" | "memeEngine" | "emotionEngine" | "audienceSimulation">): BattleDNA {
  const text = input.messages.map((m) => m.content).join(" ");
  const uniqueRatio = new Set(text.toLowerCase().split(/\s+/).filter(Boolean)).size / Math.max(text.split(/\s+/).filter(Boolean).length, 1);

  return {
    humor: clamp(45 + hits(text, /\b(lol|haha|wild|meme|cook|cooked|ratio|peak)\b/gi) * 8),
    logic: clamp(45 + hits(text, /\b(because|logic|evidence|reason|therefore|point)\b/gi) * 8),
    creativity: clamp(40 + uniqueRatio * 55 + report.memeEngine.references.length * 3),
    originality: clamp(35 + uniqueRatio * 60),
    aggression: clamp(35 + hits(text, /\b(destroy|dead|trash|cooked|ratio|sit down|cope)\b/gi) * 7),
    confidence: clamp(45 + hits(text, /\b(clearly|obvious|easy|watch|no cap)\b/gi) * 8),
    audienceAppeal: report.audienceSimulation.engagementScore,
    emotionalIntensity: clamp(40 + Object.values(report.emotionEngine).flat().length * 7),
    culturalDensity: clamp(25 + report.slangEngine.detected.length * 6 + report.memeEngine.references.length * 8),
  };
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
