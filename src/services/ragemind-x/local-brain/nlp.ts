import type {
  BrainCharacterSignal,
  BrainCoreference,
  BrainDependencyEdge,
  BrainEntity,
  BrainIntentSignal,
  BrainLanguageScore,
  BrainPhraseChunk,
  BrainSentence,
  BrainSyntaxNode,
  BrainToken,
  LocalBrainRequest,
  NlpAnalysis,
} from "@/services/ragemind-x/local-brain/types";

const TOKEN_PATTERN =
  /[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*|\p{N}+(?:[.,]\p{N}+)*|\p{Extended_Pictographic}|[!?.,;:()[\]{}"']+|[^\s]/gu;

const SENTENCE_PATTERN = /[^.!?\n]+[.!?]*|[\n]+/g;

const INDIAN_LANGUAGE_HINTS: { language: string; pattern: RegExp; evidence: string }[] = [
  { language: "Hindi/Hinglish", pattern: /\b(arey|arre|bhai|yaar|kya|matlab|nahi|hai|toh|tu|bakwas|mast|acha)\b/i, evidence: "Hindi/Hinglish romanized terms" },
  { language: "Telugu/Tenglish", pattern: /\b(nuvvu|enti|ra|ledu|ches|idhi|idi|anna|lite teesko|mass|bagundi)\b/i, evidence: "Telugu/Tenglish romanized terms" },
  { language: "Tamil/Tanglish", pattern: /\b(enna|da|dei|macha|thala|seri|poda|semma|vera level)\b/i, evidence: "Tamil/Tanglish romanized terms" },
  { language: "Kannada/Kanglish", pattern: /\b(enu|maga|guru|beku|illa|chennagide|nodu)\b/i, evidence: "Kannada/Kanglish romanized terms" },
  { language: "Malayalam/Manglish", pattern: /\b(eda|entha|alle|poli|scene aanu|njan|sheri)\b/i, evidence: "Malayalam/Manglish romanized terms" },
  { language: "Marathi", pattern: /\b(kay|bhau|nahi|ahe|zala|barobar)\b/i, evidence: "Marathi romanized terms" },
  { language: "Punjabi", pattern: /\b(oye|paaji|chak|balle|veer|kida)\b/i, evidence: "Punjabi romanized terms" },
  { language: "Gujarati", pattern: /\b(kem|majama|su|che|barabar)\b/i, evidence: "Gujarati romanized terms" },
  { language: "Urdu", pattern: /\b(janab|acha|kya|nahi|shukriya|lafz)\b/i, evidence: "Urdu romanized terms" },
  { language: "Bengali", pattern: /\b(ki|bhalo|dada|na|ekdom|kemon)\b/i, evidence: "Bengali romanized terms" },
];

const SCRIPT_HINTS: { language: string; pattern: RegExp; evidence: string }[] = [
  { language: "Hindi/Marathi", pattern: /[\u0900-\u097F]/u, evidence: "Devanagari script" },
  { language: "Bengali", pattern: /[\u0980-\u09FF]/u, evidence: "Bengali script" },
  { language: "Punjabi", pattern: /[\u0A00-\u0A7F]/u, evidence: "Gurmukhi script" },
  { language: "Gujarati", pattern: /[\u0A80-\u0AFF]/u, evidence: "Gujarati script" },
  { language: "Tamil", pattern: /[\u0B80-\u0BFF]/u, evidence: "Tamil script" },
  { language: "Telugu", pattern: /[\u0C00-\u0C7F]/u, evidence: "Telugu script" },
  { language: "Kannada", pattern: /[\u0C80-\u0CFF]/u, evidence: "Kannada script" },
  { language: "Malayalam", pattern: /[\u0D00-\u0D7F]/u, evidence: "Malayalam script" },
  { language: "Urdu", pattern: /[\u0600-\u06FF]/u, evidence: "Arabic/Urdu script" },
];

const INTERNET_SLANG = /\b(lol|lmao|rofl|fr|ngl|idc|imo|gg|ez|mid|npc|ratio|cooked|rizz|cap|sus|brainrot|skibidi|based|cringe)\b/i;
const GAMING_SLANG = /\b(noob|nerf|buff|op|meta|ranked|clutch|spawn|camp|aimbot|gg|ez|skill issue)\b/i;
const ANIME_SLANG = /\b(senpai|kawaii|shonen|isekai|waifu|husbando|anime arc|main character)\b/i;
const COMMAND_PATTERN = /^\s*(please\s+)?(do|make|create|show|tell|explain|summarize|compare|roast|judge|rank|write|generate|find|search)\b/i;

export function analyzeNlp(request: LocalBrainRequest): NlpAnalysis {
  const rawText = request.messages.map((message) => message.content).join("\n");
  const normalizedText = normalizeUnicode(rawText);
  const tokens = tokenize(normalizedText);
  const sentences = splitSentences(normalizedText).map((sentence) => ({
    ...sentence,
    tokens: tokens.filter((token) => token.start >= sentence.start && token.end <= sentence.end),
  }));
  const characters = parseCharacters(normalizedText);
  const emoji = tokens.filter((token) => token.kind === "emoji");
  const punctuation = tokens.filter((token) => token.kind === "punctuation");
  const languages = scoreLanguages(normalizedText, request.locale);
  const codeSwitching = languages.length > 1 || (languages[0]?.language !== "English" && hasEnglishTerms(normalizedText));
  const romanizedIndianLanguage = languages.some((language) => language.evidence.some((item) => item.includes("romanized")));
  const posTags = tagPartOfSpeech(tokens);
  const phrases = chunkPhrases(tokens, posTags);
  const entities = detectEntities(tokens, posTags);
  const coreferences = resolveCoreferences(sentences, entities);
  const syntaxTree = buildSyntaxTree(sentences, phrases);
  const dependencies = buildDependencies(tokens, posTags);
  const intents = detectIntents(normalizedText, tokens);
  const questionDetected = intents.some((intent) => intent.label === "question") || normalizedText.includes("?");
  const commandDetected = intents.some((intent) => intent.label === "command") || COMMAND_PATTERN.test(normalizedText);
  const conversationType = detectConversationType(normalizedText, intents, request);
  const languageConfidence = Math.max(...languages.map((language) => language.confidence), 0);

  return {
    normalizedText,
    sentences,
    tokens,
    characters,
    emoji,
    punctuation,
    languages,
    codeSwitching,
    romanizedIndianLanguage,
    posTags,
    syntaxTree,
    dependencies,
    entities,
    coreferences,
    phrases,
    intents,
    questionDetected,
    commandDetected,
    conversationType,
    languageConfidence,
  };
}

export function normalizeUnicode(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function splitSentences(text: string): BrainSentence[] {
  const sentences: BrainSentence[] = [];
  for (const match of text.matchAll(SENTENCE_PATTERN)) {
    const value = match[0].trim();
    if (!value) continue;
    const start = match.index ?? 0;
    sentences.push({
      index: sentences.length,
      text: value,
      start,
      end: start + match[0].length,
      tokens: [],
    });
  }
  return sentences.length
    ? sentences
    : [{ index: 0, text, start: 0, end: text.length, tokens: [] }];
}

export function tokenize(text: string): BrainToken[] {
  const tokens: BrainToken[] = [];
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const value = match[0];
    const start = match.index ?? 0;
    tokens.push({
      index: tokens.length,
      value,
      normalized: value.toLowerCase(),
      kind: tokenKind(value),
      start,
      end: start + value.length,
      subwords: subwordTokenize(value),
    });
  }
  return tokens;
}

export function subwordTokenize(value: string): string[] {
  const normalized = value.toLowerCase();
  if (normalized.length <= 4 || tokenKind(value) !== "word") return [normalized];
  const chunks = new Set<string>([normalized]);
  for (let size = 3; size <= Math.min(6, normalized.length); size++) {
    for (let i = 0; i <= normalized.length - size; i++) {
      chunks.add(normalized.slice(i, i + size));
    }
  }
  return [...chunks];
}

export function parseCharacters(text: string): BrainCharacterSignal[] {
  return Array.from(text).map((char) => ({
    char,
    codePoint: `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`,
    kind: characterKind(char),
  }));
}

function tokenKind(value: string): BrainToken["kind"] {
  if (/^\p{Extended_Pictographic}$/u.test(value)) return "emoji";
  if (/^\p{N}/u.test(value)) return "number";
  if (/^[!?.,;:()[\]{}"']+$/u.test(value)) return "punctuation";
  if (/^[\p{L}\p{M}]/u.test(value)) return "word";
  return "symbol";
}

function characterKind(char: string): BrainCharacterSignal["kind"] {
  if (/^\s$/u.test(char)) return "space";
  if (/^\p{Extended_Pictographic}$/u.test(char)) return "emoji";
  if (/^\p{L}$/u.test(char)) return "letter";
  if (/^\p{M}$/u.test(char)) return "mark";
  if (/^\p{N}$/u.test(char)) return "number";
  if (/^[!?.,;:()[\]{}"']$/u.test(char)) return "punctuation";
  return "symbol";
}

function scoreLanguages(text: string, locale?: string): BrainLanguageScore[] {
  const scores: BrainLanguageScore[] = [];
  const asciiLetters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const totalLetters = text.match(/\p{L}/gu)?.length ?? 0;
  if (asciiLetters > 0 || totalLetters === 0) {
    scores.push({
      language: locale && locale.toLowerCase().startsWith("en") ? "English" : "English",
      confidence: Math.min(92, 45 + Math.round((asciiLetters / Math.max(totalLetters, 1)) * 45)),
      evidence: ["Latin alphabet and English-compatible tokenization"],
    });
  }

  for (const hint of SCRIPT_HINTS) {
    if (hint.pattern.test(text)) {
      scores.push({ language: hint.language, confidence: 88, evidence: [hint.evidence] });
    }
  }

  for (const hint of INDIAN_LANGUAGE_HINTS) {
    if (hint.pattern.test(text)) {
      const existing = scores.find((score) => score.language === hint.language);
      if (existing) {
        existing.confidence = Math.min(96, existing.confidence + 8);
        existing.evidence.push(hint.evidence);
      } else {
        scores.push({ language: hint.language, confidence: 74, evidence: [hint.evidence] });
      }
    }
  }

  if (INTERNET_SLANG.test(text)) {
    scores.push({ language: "Internet English", confidence: 72, evidence: ["Internet/Gen-Z slang"] });
  }
  if (GAMING_SLANG.test(text)) {
    scores.push({ language: "Gaming slang", confidence: 70, evidence: ["Gaming vocabulary"] });
  }
  if (ANIME_SLANG.test(text)) {
    scores.push({ language: "Anime slang", confidence: 68, evidence: ["Anime vocabulary"] });
  }

  return mergeLanguageScores(scores).sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

function mergeLanguageScores(scores: BrainLanguageScore[]): BrainLanguageScore[] {
  const merged = new Map<string, BrainLanguageScore>();
  for (const score of scores) {
    const existing = merged.get(score.language);
    if (!existing) {
      merged.set(score.language, { ...score, evidence: [...score.evidence] });
      continue;
    }
    existing.confidence = Math.max(existing.confidence, score.confidence);
    existing.evidence = [...new Set([...existing.evidence, ...score.evidence])];
  }
  return [...merged.values()];
}

function hasEnglishTerms(text: string): boolean {
  return /\b(the|and|because|actually|logic|point|answer|reply|what|why|how)\b/i.test(text);
}

function tagPartOfSpeech(tokens: BrainToken[]): { token: string; tag: string; confidence: number }[] {
  return tokens.map((token) => {
    if (token.kind === "emoji") return { token: token.value, tag: "EMOJI", confidence: 95 };
    if (token.kind === "number") return { token: token.value, tag: "NUM", confidence: 94 };
    if (token.kind === "punctuation") return { token: token.value, tag: "PUNCT", confidence: 98 };
    if (/^(i|you|he|she|it|we|they|me|him|her|us|them|this|that)$/i.test(token.value)) {
      return { token: token.value, tag: "PRON", confidence: 86 };
    }
    if (/^(is|am|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|should)$/i.test(token.value)) {
      return { token: token.value, tag: "AUX", confidence: 84 };
    }
    if (/(ing|ed)$/i.test(token.value) || /^(roast|judge|answer|prove|explain|win|lose|cook|ratio)$/i.test(token.value)) {
      return { token: token.value, tag: "VERB", confidence: 70 };
    }
    if (/(ous|ive|ful|less|able|al)$/i.test(token.value) || /^(mid|good|bad|wild|funny|logical|wrong|right)$/i.test(token.value)) {
      return { token: token.value, tag: "ADJ", confidence: 68 };
    }
    if (/^[A-Z][a-z]+/.test(token.value)) return { token: token.value, tag: "PROPN", confidence: 74 };
    return { token: token.value, tag: "NOUN", confidence: token.kind === "word" ? 58 : 40 };
  });
}

function chunkPhrases(
  tokens: BrainToken[],
  posTags: { token: string; tag: string; confidence: number }[]
): BrainPhraseChunk[] {
  const chunks: BrainPhraseChunk[] = [];
  let current: BrainToken[] = [];
  const flush = () => {
    if (!current.length) return;
    const tags = current.map((token) => posTags[token.index]?.tag ?? "NOUN");
    const kind =
      tags.every((tag) => tag === "EMOJI") ? "emoji" :
      tags.some((tag) => tag === "VERB" || tag === "AUX") ? "verb" :
      tags.some((tag) => tag === "ADJ") ? "adjective" :
      tags.every((tag) => tag === "NOUN" || tag === "PROPN" || tag === "PRON") ? "noun" :
      "mixed";
    chunks.push({
      text: current.map((token) => token.value).join(" "),
      kind,
      tokenIndexes: current.map((token) => token.index),
    });
    current = [];
  };

  for (const token of tokens) {
    if (token.kind === "punctuation") {
      flush();
      continue;
    }
    current.push(token);
    if (current.length >= 5) flush();
  }
  flush();
  return chunks.filter((chunk) => chunk.text.trim()).slice(0, 32);
}

function detectEntities(tokens: BrainToken[], posTags: { token: string; tag: string; confidence: number }[]): BrainEntity[] {
  const entities: BrainEntity[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tag = posTags[i]?.tag;
    if (/^@\w{2,32}$/.test(token.value)) {
      entities.push(entity(token.value, "handle", i, i, 94));
    } else if (/^#\w{2,64}$/.test(token.value)) {
      entities.push(entity(token.value, "hashtag", i, i, 92));
    } else if (token.kind === "number") {
      entities.push(entity(token.value, "number", i, i, 90));
    } else if (tag === "PROPN") {
      const chain = [token.value];
      let end = i;
      while (tokens[end + 1] && posTags[end + 1]?.tag === "PROPN") {
        end++;
        chain.push(tokens[end].value);
      }
      entities.push(entity(chain.join(" "), "person", i, end, chain.length > 1 ? 84 : 68));
      i = end;
    } else if (/^(anime|gaming|debate|roast|battle|creator|opponent|logic|humor)$/i.test(token.value)) {
      entities.push(entity(token.value, "topic", i, i, 72));
    }
  }
  return entities.slice(0, 24);
}

function entity(
  text: string,
  type: BrainEntity["type"],
  startToken: number,
  endToken: number,
  confidence: number
): BrainEntity {
  return { text, type, startToken, endToken, confidence };
}

function resolveCoreferences(sentences: BrainSentence[], entities: BrainEntity[]): BrainCoreference[] {
  const coreferences: BrainCoreference[] = [];
  let latestEntity = entities.find((entity) => entity.type === "person" || entity.type === "topic")?.text ?? "";
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (/^(he|she|they|it|this|that|him|her|them)$/i.test(token.value) && latestEntity) {
        coreferences.push({
          pronoun: token.value,
          referent: latestEntity,
          sentenceIndex: sentence.index,
          confidence: /^(this|that|it)$/i.test(token.value) ? 58 : 66,
        });
      }
      const entity = entities.find((item) => item.startToken === token.index);
      if (entity && (entity.type === "person" || entity.type === "topic")) latestEntity = entity.text;
    }
  }
  return coreferences.slice(0, 16);
}

function buildSyntaxTree(sentences: BrainSentence[], phrases: BrainPhraseChunk[]): BrainSyntaxNode {
  return {
    id: "root",
    label: "Conversation",
    text: "local parse",
    children: sentences.map((sentence) => ({
      id: `sentence-${sentence.index}`,
      label: "Sentence",
      text: sentence.text,
      children: phrases
        .filter((phrase) => phrase.tokenIndexes.some((index) => sentence.tokens.some((token) => token.index === index)))
        .slice(0, 8)
        .map((phrase, index) => ({
          id: `sentence-${sentence.index}-phrase-${index}`,
          label: `${phrase.kind} phrase`,
          text: phrase.text,
          children: [],
        })),
    })),
  };
}

function buildDependencies(
  tokens: BrainToken[],
  posTags: { token: string; tag: string; confidence: number }[]
): BrainDependencyEdge[] {
  const edges: BrainDependencyEdge[] = [];
  const root = tokens.find((token) => posTags[token.index]?.tag === "VERB" || posTags[token.index]?.tag === "AUX") ?? tokens[0];
  if (!root) return edges;
  for (const token of tokens) {
    if (token.index === root.index || token.kind === "punctuation") continue;
    const tag = posTags[token.index]?.tag ?? "NOUN";
    const relation =
      tag === "PRON" ? "subject-or-reference" :
      tag === "ADJ" ? "modifier" :
      tag === "EMOJI" ? "tone" :
      token.index < root.index ? "left-context" :
      "object-or-complement";
    edges.push({
      head: root.value,
      dependent: token.value,
      relation,
      confidence: tag === "EMOJI" ? 82 : 58,
    });
  }
  return edges.slice(0, 40);
}

function detectIntents(text: string, tokens: BrainToken[]): BrainIntentSignal[] {
  const checks: BrainIntentSignal[] = [
    intent("question", /\?|(?:\b(why|what|how|when|where|who|explain|answer)\b)/i, text, "question marker"),
    intent("command", COMMAND_PATTERN, text, "imperative verb"),
    intent("debate", /\b(because|therefore|evidence|logic|proof|argument|counter|point|claim)\b/i, text, "reasoning/debate terms"),
    intent("roast", /\b(cooked|ratio|trash|clown|washed|mid|npc|skill issue|sit down)\b/i, text, "roast slang"),
    intent("humor", /\b(lol|lmao|haha|joke|meme|wild|funny|brainrot)\b/i, text, "humor marker"),
    intent("support", /\b(respect|valid|good point|fair|gg|agree)\b/i, text, "support marker"),
    intent("explain", /\b(explain|summarize|tell me|meaning|why does|how does)\b/i, text, "explanation request"),
    intent("challenge", /\b(prove|try me|beat|defend|answer this|show me|still waiting)\b/i, text, "challenge marker"),
    intent("story", /\b(once|story|imagine|then|after that|character|arc)\b/i, text, "narrative marker"),
  ].filter((signal) => signal.confidence > 0);

  if (!checks.length && tokens.length) {
    return [{ label: "unknown", confidence: 35, evidence: ["No strong local intent rule matched."] }];
  }
  return checks.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

function intent(
  label: BrainIntentSignal["label"],
  pattern: RegExp,
  text: string,
  evidence: string
): BrainIntentSignal {
  const matches = text.match(pattern)?.length ?? 0;
  return {
    label,
    confidence: matches ? Math.min(95, 58 + matches * 12) : 0,
    evidence: matches ? [evidence] : [],
  };
}

function detectConversationType(
  text: string,
  intents: BrainIntentSignal[],
  request: LocalBrainRequest
): NlpAnalysis["conversationType"] {
  const labels = new Set(intents.map((intent) => intent.label));
  const context = `${request.title ?? ""} ${request.topic ?? ""} ${request.mode ?? ""} ${text}`;
  if (/\b(battle|roast|judge|winner|opponent|round)\b/i.test(context) || labels.has("roast")) return "battle";
  if (labels.has("support")) return "support";
  if (/\b(plan|strategy|todo|next step|roadmap)\b/i.test(context)) return "planning";
  if (labels.has("question") || labels.has("explain")) return "qa";
  if (text.length > 0) return "casual";
  return "unknown";
}
