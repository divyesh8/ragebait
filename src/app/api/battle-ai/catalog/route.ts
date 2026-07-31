import { NextResponse } from "next/server";
import { getBattleAiCatalog } from "@/services/battleAiSystem";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getBattleAiCatalog());
  } catch (err) {
    console.error("Battle AI catalog error:", err);
    return NextResponse.json({ error: "Unable to load Battle AI opponents." }, { status: 500 });
  }
}
