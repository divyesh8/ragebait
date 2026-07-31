import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { postBattleAiMessage } from "@/services/battleAiSystem";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  try {
    const result = await postBattleAiMessage({
      userId: session.userId,
      username: session.username,
      battleId: params.id,
      content: parsed.data.content,
    });

    if (result.blocked) {
      return NextResponse.json(
        {
          error: "Message blocked. Keep Battle AI competitive.",
          moderation: result.moderation,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Post Battle AI message error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to post Battle AI message." }, { status: 500 });
  }
}
