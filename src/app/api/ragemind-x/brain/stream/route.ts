import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { runLocalBrain } from "@/services/ragemind-x/local-brain/brain";

export const dynamic = "force-dynamic";

const streamSchema = z.object({
  conversationId: z.string().max(160).optional(),
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
  generation: z.object({
    objective: z.string().max(300).optional(),
    tone: z.string().max(80).optional(),
    maxTokens: z.number().int().min(20).max(500).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const parsed = streamSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid stream request." }, { status: 400 });
  }

  const result = await runLocalBrain({
    ...parsed.data,
    userId: session.userId,
    messages: parsed.data.messages.map((message) => ({
      ...message,
      userId: session.userId,
      username: session.username,
    })),
    generation: { ...parsed.data.generation, stream: true },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of result.response.streamableChunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, observability: result.observability })}\n\n`));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
