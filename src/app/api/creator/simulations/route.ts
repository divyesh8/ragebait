import { NextRequest, NextResponse } from "next/server";
import { requireCreatorFromRequest, recordCreatorAction } from "@/lib/creator";
import {
  getSimulationOverview,
  manualGenerateSimulation,
  tickSimulationScheduler,
  updateSimulationSettings,
} from "@/services/simulationEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json(await getSimulationOverview());
  } catch (err) {
    console.error("Simulation overview error:", err);
    return NextResponse.json({ error: "Unable to load simulations." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = ["running", "paused", "stopped"].includes(body.status) ? body.status : undefined;

  try {
    const settings = await updateSimulationSettings({
      status,
      hourlyMin: Number.isFinite(Number(body.hourlyMin)) ? Number(body.hourlyMin) : undefined,
      hourlyMax: Number.isFinite(Number(body.hourlyMax)) ? Number(body.hourlyMax) : undefined,
      maxConcurrent: Number.isFinite(Number(body.maxConcurrent)) ? Number(body.maxConcurrent) : undefined,
    });

    await recordCreatorAction({
      creatorUserId: creator.userId,
      action: "simulation_settings_update",
      newValue: settings,
      reason: String(body.reason ?? "Simulation setting change"),
      req,
    });

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Simulation settings error:", err);
    return NextResponse.json({ error: "Unable to update simulation settings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const creator = await requireCreatorFromRequest(req);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "tick") {
      const result = await tickSimulationScheduler();
      await recordCreatorAction({
        creatorUserId: creator.userId,
        action: "simulation_tick",
        newValue: result,
        reason: String(body.reason ?? "Manual scheduler tick"),
        req,
      });
      return NextResponse.json(result);
    }

    if (action === "manual_generate") {
      const count = Number.isFinite(Number(body.count)) ? Number(body.count) : 1;
      const simulations = await manualGenerateSimulation(count);
      await recordCreatorAction({
        creatorUserId: creator.userId,
        action: "simulation_manual_generate",
        newValue: { count: simulations.length },
        reason: String(body.reason ?? "Manual simulation generation"),
        req,
      });
      return NextResponse.json({ simulations });
    }

    return NextResponse.json({ error: "Unknown simulation action." }, { status: 400 });
  } catch (err) {
    console.error("Simulation action error:", err);
    return NextResponse.json({ error: "Unable to run simulation action." }, { status: 500 });
  }
}
