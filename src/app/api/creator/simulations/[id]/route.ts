import { NextRequest, NextResponse } from "next/server";
import { deleteSimulationBattle } from "@/services/simulationEngine";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteSimulationBattle(params.id);
    await recordCreatorAction({
      creatorUserId: creator.userId,
      action: "simulation_delete",
      previousValue: { id: params.id },
      reason: req.nextUrl.searchParams.get("reason") ?? "Deleted simulation battle",
      req,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete simulation error:", err);
    return NextResponse.json({ error: "Unable to delete simulation." }, { status: 500 });
  }
}
