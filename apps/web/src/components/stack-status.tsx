"use client";

import { useEffect } from "react";
import type { HealthSnapshot } from "@/services/health-api";
import { useHealthStore } from "@/stores/health-store";

type Props = {
  initial: {
    health: HealthSnapshot;
    recorridoCount: number;
    potholeCount: number;
  };
};

export function StackStatus({ initial }: Props) {
  const health = useHealthStore((state) => state.health);
  const recorridoCount = useHealthStore((state) => state.recorridoCount);
  const potholeCount = useHealthStore((state) => state.potholeCount);
  const hydrate = useHealthStore((state) => state.hydrate);
  const refresh = useHealthStore((state) => state.refresh);

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  const snapshot = health ?? initial.health;
  const photos = health ? recorridoCount : initial.recorridoCount;
  const holes = health ? potholeCount : initial.potholeCount;

  return (
    <section className="space-y-3 border-t border-white/10 pt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl text-asphalt-50">Estado del stack</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-signal-teal hover:underline"
        >
          Actualizar
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        <StatusRow label="PostgreSQL" ok={snapshot.checks.database} />
        <StatusRow label="Analyzer FastAPI" ok={snapshot.checks.analyzer} />
        <li className="flex justify-between gap-4 border-b border-white/5 py-2">
          <span className="text-[color:var(--muted)]">Recorridos / baches</span>
          <span className="text-asphalt-100">
            {photos} / {holes}
          </span>
        </li>
        <li className="flex justify-between gap-4 border-b border-white/5 py-2">
          <span className="text-[color:var(--muted)]">MQTT (tópicos)</span>
          <span className="text-right font-mono text-xs text-asphalt-100">
            {snapshot.checks.mqttTopics.join(", ")}
          </span>
        </li>
      </ul>
    </section>
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
