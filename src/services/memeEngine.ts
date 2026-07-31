import type { RageMindInput } from "@/services/rageMind";

export interface MemeAnalysis {
  references: string[];
  interpretations: string[];
}

const MEMES: Record<string, string> = {
  "uno reverse": "turning the opponent's attack back on them",
  drake: "preference/rejection comparison format",
  gigachad: "overconfident winner archetype",
  skibidi: "absurdist brainrot humor",
  "john cena": "invisibility or surprise-reference humor",
  "spider-man": "two sides accusing each other of the same thing",
  spiderman: "two sides accusing each other of the same thing",
  "surprised pikachu": "mock shock at predictable consequences",
  "average fan": "comparison meme contrasting weak vs strong taste",
  ohio: "surreal absurdity meme",
  brainrot: "intentionally chaotic internet-humor style",
};

export function analyzeMemes(input: RageMindInput): MemeAnalysis {
  const text = input.messages.map((m) => m.content).join(" ").toLowerCase();
  const references = Object.keys(MEMES).filter((meme) => text.includes(meme));
  return {
    references,
    interpretations: references.map((meme) => `${meme}: ${MEMES[meme]}; treat as cultural context, not filler.`),
  };
}
