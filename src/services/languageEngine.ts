import type { RageMindInput } from "@/services/rageMind";

export interface LanguageAnalysis {
  primaryLanguages: string[];
  mixedLanguage: boolean;
  codeSwitching: boolean;
  notes: string[];
}

const LANGUAGE_HINTS: { language: string; pattern: RegExp }[] = [
  { language: "Hindi/Hinglish", pattern: /\b(arey|bhai|yaar|kya|matlab|chill|scene|bakwas|tu|toh|hai)\b/i },
  { language: "Telugu/Tenglish", pattern: /\b(nuvvu|enti|ra|le|ledu|cheyy|ches|idhi|idi|lite teesko|anna|gelavalevu|adhi)\b/i },
  { language: "Tamil/Tanglish", pattern: /\b(enna|da|macha|thala|seri|poda|dei)\b/i },
  { language: "Kannada/Kanglish", pattern: /\b(enu|maga|guru|beku|illa)\b/i },
  { language: "Malayalam/Manglish", pattern: /\b(eda|entha|alle|poli|scene aanu)\b/i },
  { language: "Gujarati", pattern: /\b(kem|majama|bhai|su)\b/i },
  { language: "Punjabi", pattern: /\b(oye|paaji|chak|balle|veer)\b/i },
  { language: "Marathi", pattern: /\b(kay|bhau|nahi|ahe)\b/i },
  { language: "Bengali", pattern: /\b(ki|bhalo|dada|na)\b/i },
  { language: "Urdu", pattern: /\b(janab|acha|kya|nahi|bhai)\b/i },
];

export function analyzeLanguage(input: RageMindInput): LanguageAnalysis {
  const text = input.messages.map((m) => m.content).join("\n");
  const detected = LANGUAGE_HINTS.filter((hint) => hint.pattern.test(text)).map((hint) => hint.language);
  const primaryLanguages = Array.from(new Set(["English", ...detected]));
  const codeSwitching =
    primaryLanguages.length > 1 && /\b(because|actually|argument|logic|sense|comeback|debate|reply)\b/i.test(text);

  return {
    primaryLanguages,
    mixedLanguage: primaryLanguages.length > 1,
    codeSwitching,
    notes:
      primaryLanguages.length > 1
        ? [
            "Mixed-language and transliterated phrasing detected; judge intent and cultural usage instead of literal translation.",
            "Do not penalize grammar, accent, or non-native English if the comeback or argument lands.",
          ]
        : [],
  };
}
