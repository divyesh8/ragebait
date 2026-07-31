import type { BattleSide, RageMindInput, RageMindReport } from "@/services/rageMind";

export interface PlayerDNA {
  label: "Master Strategist" | "Chaos Roaster" | "Comedy Specialist" | "Logic Destroyer" | "Balanced Thinker" | "Adaptive Fighter";
  traits: string[];
  humorStyle: string;
  argumentStructure: string;
  growthSignal: string;
}

export type PlayerDNAResult = Record<BattleSide, PlayerDNA>;

export function generatePlayerDNA(input: RageMindInput, report: Pick<RageMindReport, "personalityEngine" | "emotionEngine" | "reasoningEngine">): PlayerDNAResult {
  return {
    creator: buildSideDNA(input, report, "creator"),
    opponent: buildSideDNA(input, report, "opponent"),
  };
}

function buildSideDNA(input: RageMindInput, report: Pick<RageMindReport, "personalityEngine" | "emotionEngine" | "reasoningEngine">, side: BattleSide): PlayerDNA {
  const messages = input.messages.filter((m) => m.side === side).map((m) => m.content).join(" ");
  const traits = Array.from(new Set([...(report.personalityEngine[side] ?? []), ...(report.emotionEngine[side] ?? [])])).slice(0, 6);
  const logic = hits(messages, /\b(because|logic|evidence|reason|therefore|point)\b/gi);
  const humor = hits(messages, /\b(lol|haha|meme|wild|cook|cooked|ratio)\b/gi);
  const adaptive = hits(messages, /\b(you said|your point|earlier|actually|but)\b/gi);

  return {
    label: chooseLabel(logic, humor, adaptive, traits),
    traits,
    humorStyle: humor > 2 ? "Internet-culture punchlines and quick dismissive slang" : "Low-key or situational humor",
    argumentStructure: logic > 2 ? "Reason-led rebuttals with explicit cause/effect framing" : "Punchline-led replies with lighter structure",
    growthSignal: report.reasoningEngine.repeatedArguments.some((note) => note.includes(side))
      ? "Needs more variation across rounds."
      : "Shows room to build a stronger long-term signature style.",
  };
}

function chooseLabel(logic: number, humor: number, adaptive: number, traits: string[]): PlayerDNA["label"] {
  if (adaptive >= 3) return "Adaptive Fighter";
  if (logic >= 3 && humor >= 2) return "Master Strategist";
  if (logic >= 3) return "Logic Destroyer";
  if (humor >= 3 && traits.includes("Aggressive")) return "Chaos Roaster";
  if (humor >= 3) return "Comedy Specialist";
  return "Balanced Thinker";
}

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}
