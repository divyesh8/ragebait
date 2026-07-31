import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { runLocalBrain } from "@/services/ragemind-x/local-brain/brain";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "creator", "opponent"]).default("user"),
  content: z.string().trim().min(1).max(8000),
  userId: z.string().max(120).optional(),
  username: z.string().max(80).optional(),
  round: z.number().int().min(0).max(1000).optional(),
  createdAt: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const brainRequestSchema = z.object({
  conversationId: z.string().max(160).optional(),
  title: z.string().max(180).optional(),
  topic: z.string().max(180).optional(),
  mode: z.string().max(80).optional(),
  locale: z.string().max(40).optional(),
  personalityId: z.string().max(80).optional(),
  personality: z.record(z.unknown()).optional(),
  messages: z.array(messageSchema).min(1).max(60),
  knowledgePacks: z.array(z.any()).max(10).optional(),
  memories: z.array(z.any()).max(100).optional(),
  generation: z.object({
    objective: z.string().max(300).optional(),
    tone: z.string().max(80).optional(),
    maxTokens: z.number().int().min(20).max(500).optional(),
    stream: z.boolean().optional(),
  }).optional(),
  options: z.object({
    maxRetrievedMemories: z.number().int().min(0).max(20).optional(),
    maxRetrievedKnowledge: z.number().int().min(0).max(20).optional(),
    enableLearningCandidates: z.boolean().optional(),
    now: z.string().max(80).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const parsed = brainRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid local brain request." }, { status: 400 });
  }

  const result = await runLocalBrain({
    ...parsed.data,
    userId: session.userId,
    messages: parsed.data.messages.map((message) => ({
      ...message,
      userId: message.userId ?? session.userId,
      username: message.username ?? session.username,
    })),
  });

  return NextResponse.json(result);
}
