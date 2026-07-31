import type { RageMindInput } from "@/services/rageMind";

export interface SlangAnalysis {
  detected: string[];
  interpretations: string[];
}

const SLANG_MEANINGS: Record<string, string> = {
  cooked: "badly beaten, exposed, or outplayed",
  cook: "perform well or build a strong point",
  npc: "generic or unoriginal behavior",
  "aura farming": "performing for status or social points",
  "skill issue": "mocking weak execution rather than literal skill",
  ratio: "audience rejection or being outperformed",
  gg: "game-over energy, respect, or dismissal depending on tone",
  goat: "greatest or highly respected",
  sigma: "internet persona shorthand for detached confidence",
  gigachad: "exaggerated confident winner archetype",
  delulu: "delusional optimism or denial",
  cap: "lie or exaggeration",
  "no cap": "sincere or truthful",
  mid: "average or unimpressive",
  peak: "excellent or highly entertaining",
  based: "confidently agreeable or bold",
  cringe: "socially awkward or embarrassing",
  "touch grass": "accusing someone of being too online",
  brainrot: "absurd internet-humor overload",
  ohio: "surreal or absurd meme shorthand",
  w: "win or approval",
  l: "loss or disapproval",
};

export function analyzeSlang(input: RageMindInput): SlangAnalysis {
  const text = input.messages.map((m) => m.content).join(" ").toLowerCase();
  const detected = Object.keys(SLANG_MEANINGS).filter((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text));

  return {
    detected,
    interpretations: detected.map((term) => `${term}: ${SLANG_MEANINGS[term]}; interpret by battle context and tone.`),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
