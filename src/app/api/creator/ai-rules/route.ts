import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import { invalidateRuleCache } from "@/services/ruleEngine";
import { invalidateKnowledgeCache } from "@/services/knowledgeBase";
import { selfTestJudge, type JudgeInput } from "@/services/aiJudge";
import { RAGEMIND_X_VERSION } from "@/services/ragemind-x/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// GET /api/creator/ai-rules — current rules + knowledge base.
// With ?selftest=1: run the brain regression suite instead (fixture battles
// with known expected winners — flags any behavior drift after changes).
export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  if (req.nextUrl.searchParams.get("selftest") === "1") {
    return NextResponse.json(await runBrainSelfTest());
  }

  const [rules, knowledge, feedback] = await Promise.all([
    sql`SELECT key, value, description, updated_at FROM ai_rules ORDER BY key`,
    sql`SELECT id, category, term, meaning, language, weight, version, active FROM ai_knowledge ORDER BY category, term`,
    sql`SELECT kind, COUNT(*)::int AS count FROM ai_feedback GROUP BY kind`,
  ]);
  return NextResponse.json({ rules, knowledge, feedbackCounts: feedback });
}

const ruleSchema = z.object({
  key: z.string().min(2).max(100),
  value: z.unknown(),
  description: z.string().max(300).optional(),
  reason: z.string().min(3, "A reason is required for every creator action."),
});

// PATCH /api/creator/ai-rules — create or update a rule (weights, thresholds…)
export async function PATCH(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = ruleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { key, value, description, reason } = parsed.data;

  const before = await sql`SELECT value FROM ai_rules WHERE key = ${key} LIMIT 1`;
  const updated = await sql`
    INSERT INTO ai_rules (key, value, description)
    VALUES (${key}, ${JSON.stringify(value)}, ${description ?? ""})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          description = COALESCE(NULLIF(EXCLUDED.description, ''), ai_rules.description),
          updated_at = now()
    RETURNING key, value
  `;
  invalidateRuleCache();

  await recordCreatorAction({
    creatorUserId: creator.userId,
    action: "ai.rule_update",
    previousValue: before[0]?.value ?? null,
    newValue: updated[0].value,
    reason,
    req,
  });

  return NextResponse.json({ success: true, rule: updated[0] });
}

const knowledgeSchema = z.object({
  category: z.enum([
    "slang",
    "hinglish",
    "meme",
    "abbreviation",
    "emoji",
    "roast_template",
    "insult",
    "movies",
    "anime",
    "programming",
    "history",
    "science",
    "gaming",
    "sports",
    "technology",
    "music",
    "finance",
  ]),
  term: z.string().min(1).max(120),
  meaning: z.string().min(1).max(400),
  language: z.string().max(10).optional(),
  weight: z.number().int().min(1).max(10).optional(),
  active: z.boolean().optional(),
  reason: z.string().min(3, "A reason is required for every creator action."),
});

// POST /api/creator/ai-rules — add or update a knowledge base entry (versioned)
export async function POST(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = knowledgeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { category, term, meaning, language, weight, active, reason } = parsed.data;

  const entry = await sql`
    INSERT INTO ai_knowledge (category, term, meaning, language, weight, active)
    VALUES (${category}, ${term}, ${meaning}, ${language ?? "en"}, ${weight ?? 5}, ${active ?? true})
    ON CONFLICT (category, term) DO UPDATE
      SET meaning = EXCLUDED.meaning,
          language = EXCLUDED.language,
          weight = EXCLUDED.weight,
          active = EXCLUDED.active,
          version = ai_knowledge.version + 1,
          updated_at = now()
    RETURNING id, category, term, meaning, version, active
  `;
  invalidateKnowledgeCache();

  await recordCreatorAction({
    creatorUserId: creator.userId,
    action: "ai.knowledge_upsert",
    newValue: entry[0],
    reason,
    req,
  });

  return NextResponse.json({ success: true, entry: entry[0] });
}

// =========================================================
// Brain self-test — regression fixtures with known winners
// =========================================================

interface Fixture {
  name: string;
  expected: "creator" | "opponent";
  creatorLines: string[];
  opponentLines: string[];
}

const FIXTURES: Fixture[] = [
  {
    name: "sharp counters beat bland repeats",
    expected: "creator",
    creatorLines: [
      "You're built like Internet Explorer, bro — outdated and everyone left you for something better.",
      "At least I eventually load — you've been buffering since round one and still no punchline arrived.",
      "That callback to your Internet Explorer era? Even Microsoft gave up on you faster.",
    ],
    opponentLines: [
      "you are bad at this game",
      "you are bad at this game fr",
      "you are so bad at this game",
    ],
  },
  {
    name: "real engagement beats emoji spam",
    expected: "creator",
    creatorLines: [
      "Your roast game is like your wifi — everyone in the house complains about it.",
      "Still waiting for an actual reply, but I get it, thinking is a premium feature you didn't unlock.",
      "Three rounds in and your best argument is punctuation. The audience deserves a refund.",
    ],
    opponentLines: ["💀💀💀💀💀💀", "🔥🔥🔥 !!!", "😂😂 lol ok"],
  },
  {
    name: "structured logic wins the debate",
    expected: "opponent",
    creatorLines: ["nah you're wrong", "whatever bro", "this topic is boring anyway"],
    opponentLines: [
      "The evidence says otherwise: because engagement doubled after the update, the feature clearly worked, therefore your claim collapses.",
      "You said it failed, but the retention numbers you ignored are the exact reason your point doesn't hold.",
      "So we agree the data is real — which means your whole argument was vibes, and mine had receipts.",
    ],
  },
  {
    name: "recycled joke loses to fresh variety",
    expected: "opponent",
    creatorLines: [
      "Your wifi is faster than your brain, that's crazy.",
      "Honestly your brain is slower than your wifi, crazy stuff.",
      "Wifi faster than that brain of yours, crazy.",
    ],
    opponentLines: [
      "You told the same joke three times — even your material has a loading screen.",
      "New round, new angle: your creativity retired earlier than a one-hit-wonder's tour.",
      "I'd roast your originality, but you'd just repost mine with a typo.",
    ],
  },
];

async function runBrainSelfTest() {
  const results = [];
  for (const f of FIXTURES) {
    const messages = [];
    for (let r = 0; r < Math.max(f.creatorLines.length, f.opponentLines.length); r++) {
      if (f.creatorLines[r]) messages.push({ user_id: "c", content: f.creatorLines[r], round: r + 1 });
      if (f.opponentLines[r]) messages.push({ user_id: "o", content: f.opponentLines[r], round: r + 1 });
    }
    const input: JudgeInput = {
      topic: "Self-test arena",
      title: f.name,
      battleType: "casual",
      mode: "text",
      creatorId: "c",
      opponentId: "o",
      creatorName: "FixtureCreator",
      opponentName: "FixtureOpponent",
      messages,
    };
    const verdict = await selfTestJudge(input);
    results.push({
      name: f.name,
      expected: f.expected,
      got: verdict.winner,
      pass: verdict.winner === f.expected,
      totals: { creator: verdict.scores.creator.total, opponent: verdict.scores.opponent.total },
      panel: verdict.panel?.summary ?? "",
    });
  }
  const passed = results.filter((r) => r.pass).length;
  return {
    brainVersion: RAGEMIND_X_VERSION,
    passed,
    failed: results.length - passed,
    allPass: passed === results.length,
    results,
  };
}
