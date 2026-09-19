import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { AnalyzerClient, MqttBridge } from "@/domain/ports";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const container = createAppContainer();
  const analyzer = container.resolve<AnalyzerClient>(TOKENS.AnalyzerClient);
  const mqtt = container.resolve<MqttBridge>(TOKENS.MqttBridge);

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const analyzerOk = await analyzer.health();

  return NextResponse.json({
    ok: database,
    service: "web",
    checks: {
      database,
      analyzer: analyzerOk,
      mqttTopics: mqtt.describeTopics(),
    },
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones",
  });
}
