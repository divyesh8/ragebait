import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";

const suggestSchema = z.object({
  prompt: z.string().min(3, "Tell me a bit more about what you want to battle over.").max(200),
});

interface BattleSuggestion {
  title: string;
  topic: string;
  sideA: string;
  sideB: string;
}

// POST /api/battles/suggest — local helper that turns a rough idea into a battle setup.
// Does not create a battle; the client still submits the final fields through POST /api/battles.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = suggestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  return NextResponse.json({ suggestion: localSuggestion(parsed.data.prompt) });
}

function localSuggestion(prompt: string): BattleSuggestion {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  const topic = cleaned.length > 60 ? cleaned.slice(0, 57) + "..." : cleaned || "Open Debate";
  const frame = inferFrame(cleaned);
  return {
    title: `${topic}: ${frame.title}`,
    topic,
    sideA: `Team A: ${frame.sideA(cleaned || "this idea")}`,
    sideB: `Team B: ${frame.sideB(cleaned || "that take")}`,
  };
}

function inferFrame(prompt: string) {
  if (/\b(ai|tech|code|app|phone|internet|startup)\b/i.test(prompt)) {
    return {
      title: "Upgrade or Overhype?",
      sideA: (topic: string) => `${topic} is the obvious upgrade; the doubters are stuck on old firmware.`,
      sideB: (topic: string) => `${topic} is mostly hype with better marketing than actual proof.`,
    };
  }
  if (/\b(anime|movie|film|hero|villain|marvel|dc|bollywood)\b/i.test(prompt)) {
    return {
      title: "Main Character Debate",
      sideA: (topic: string) => `${topic} has the stronger story, bigger moments, and more replay value.`,
      sideB: (topic: string) => `${topic} survives on fan noise; the actual writing does not clear the bar.`,
    };
  }
  if (/\b(game|gaming|rank|valorant|pubg|cricket|football|sport)\b/i.test(prompt)) {
    return {
      title: "Skill or Excuses?",
      sideA: (topic: string) => `${topic} rewards real skill; losing to it is a practice issue.`,
      sideB: (topic: string) => `${topic} is overrated chaos pretending to be skill.`,
    };
  }
  return {
    title: "Who Actually Wins?",
    sideA: (topic: string) => `${topic} is the stronger side, and the opposing take is surviving on vibes.`,
    sideB: (topic: string) => `${topic} collapses under pressure; the other side just says it louder.`,
  };
}
