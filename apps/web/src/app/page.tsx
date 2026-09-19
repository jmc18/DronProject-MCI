import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { AnalyzerClient, MqttBridge } from "@/domain/ports";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStatus() {
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

  return {
    database,
    analyzer: await analyzer.health(),
    mqttTopics: mqtt.describeTopics(),
  };
}

export default async function HomePage() {
  const status = await getStatus();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-signal-teal">DronProject-MCI</p>
        <h1 className="font-display text-4xl leading-tight text-asphalt-50 md:text-5xl">
          {appName}
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--muted)]">
          Prototipo de detección y segmentación de baches con imágenes aéreas, ingestión IoT
          (Raspberry Pi / ESP32) y análisis PDI/DSP + YOLOv8.
        </p>
      </header>

      <section className="space-y-3 border-t border-white/10 pt-8">
        <h2 className="font-display text-xl text-asphalt-50">Estado del stack</h2>
        <ul className="space-y-2 text-sm">
          <StatusRow label="PostgreSQL" ok={status.database} />
          <StatusRow label="Analyzer FastAPI" ok={status.analyzer} />
          <li className="flex justify-between gap-4 border-b border-white/5 py-2">
            <span className="text-[color:var(--muted)]">MQTT (tópicos)</span>
            <span className="text-right font-mono text-xs text-asphalt-100">
              {status.mqttTopics.join(", ")}
            </span>
          </li>
        </ul>
      </section>

      <section className="text-sm text-[color:var(--muted)]">
        <p>
          Endpoints: <code className="text-asphalt-100">/api/health</code>,{" "}
          <code className="text-asphalt-100">/api/analyze</code>,{" "}
          <code className="text-asphalt-100">/api/iot/ingest</code>
        </p>
      </section>
    </main>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex justify-between gap-4 border-b border-white/5 py-2">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className={ok ? "text-signal-teal" : "text-signal-amber"}>
        {ok ? "OK" : "No disponible"}
      </span>
    </li>
  );
}
