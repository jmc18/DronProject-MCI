import Link from "next/link";
import { StackStatus } from "@/components/stack-status";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { AnalyzerClient, InspectionRepository, MqttBridge } from "@/domain/ports";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStatus() {
  const container = createAppContainer();
  const analyzer = container.resolve<AnalyzerClient>(TOKENS.AnalyzerClient);
  const mqtt = container.resolve<MqttBridge>(TOKENS.MqttBridge);
  const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const recorridos = database ? await inspections.list() : [];
  const analyzerOk = await analyzer.health();
  const mqttTopics = mqtt.describeTopics();

  return {
    health: {
      ok: database,
      app: process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones",
      checks: {
        database,
        analyzer: analyzerOk,
        mqttTopics,
      },
    },
    recorridoCount: recorridos.length,
    potholeCount: recorridos.reduce((sum, item) => sum + item.potholeCount, 0),
  };
}

export default async function HomePage() {
  const status = await getStatus();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="font-orbitron text-sm uppercase tracking-[0.2em] text-signal-teal">
          DronProject-MCI
        </p>
        <h1 className="font-orbitron text-4xl leading-tight text-asphalt-50 md:text-5xl">
          {appName}
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--muted)]">
          Sube las fotos de un recorrido, revisa los baches detectados sobre cada imagen y
          descarga un informe PDF listo para entregar.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/recorridos/nuevo"
            className="rounded-full bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
          >
            Nuevo recorrido
          </Link>
          <Link
            href="/recorridos"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-asphalt-50"
          >
            Ver análisis
          </Link>
        </div>
      </header>

      <StackStatus initial={status} />
    </main>
  );
}
