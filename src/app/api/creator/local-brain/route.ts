import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCreatorFromRequest } from "@/lib/creator";
import { listLocalModelAdapters, runLocalBrain } from "@/services/ragemind-x/local-brain";
import { listBrainPersonalities } from "@/services/ragemind-x/local-brain/personality";
import { runLocalBrainBenchmarks } from "@/services/ragemind-x/local-brain/benchmarks";
import { readLocalBrainTelemetry } from "@/services/ragemind-x/telemetry";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const debugSchema = z.object({
  title: z.string().max(180).optional(),
  topic: z.string().max(180).optional(),
  mode: z.string().max(80).optional(),
  locale: z.string().max(40).optional(),
  personalityId: z.string().max(80).optional(),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "creator", "opponent"]).default("user"),
    content: z.string().trim().min(1).max(8000),
    round: z.number().int().min(0).max(1000).optional(),
  })).min(1).max(60),
});

export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  if (req.nextUrl.searchParams.get("benchmarks") === "1" || req.nextUrl.searchParams.get("selftest") === "1") {
    return NextResponse.json(await runLocalBrainBenchmarks());
  }

  const [telemetry] = await Promise.all([readLocalBrainTelemetry()]);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    telemetry,
    adapters: listLocalModelAdapters(),
    personalities: listBrainPersonalities(),
    debugging: {
      endpoints: [
        "POST /api/ragemind-x/brain",
        "POST /api/ragemind-x/brain/stream",
        "GET /api/creator/local-brain?benchmarks=1",
      ],
      localOnly: true,
      externalInference: false,
    },
  });
}

export async function POST(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return notFound();

  const parsed = debugSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid debug request." }, { status: 400 });
  }

  const result = await runLocalBrain({
    ...parsed.data,
    userId: creator.userId,
    conversationId: `creator-debug-${Date.now()}`,
    messages: parsed.data.messages.map((message) => ({
      ...message,
      userId: creator.userId,
      username: creator.username,
    })),
    generation: {
      objective: "creator diagnostic run",
      maxTokens: 180,
    },
  });
  return NextResponse.json(result);
}
