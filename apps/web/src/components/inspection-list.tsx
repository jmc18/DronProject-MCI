"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusChip } from "@/components/status-chip";
import type { InspectionListItemDto } from "@/domain/inspection-view";
import { useInspectionStore } from "@/stores/inspection-store";

export function InspectionList({ initial }: { initial: InspectionListItemDto[] }) {
  const items = useInspectionStore((state) => state.items);
  const listStatus = useInspectionStore((state) => state.listStatus);
  const listError = useInspectionStore((state) => state.listError);
  const hydrateList = useInspectionStore((state) => state.hydrateList);
  const fetchList = useInspectionStore((state) => state.fetchList);

  useEffect(() => {
    hydrateList(initial);
  }, [hydrateList, initial]);

  const rows = items.length > 0 || listStatus === "loading" ? items : initial;

  if (listStatus === "error" && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center">
        <p className="text-red-200">{listError}</p>
        <button
          type="button"
          onClick={() => void fetchList()}
          className="mt-4 rounded-full bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="font-display text-2xl text-asphalt-50">Aún no hay recorridos</p>
        <p className="mt-2 text-[color:var(--muted)]">
          Crea uno y sube las fotos del tramo para ver el análisis aquí.
        </p>
        <Link
          href="/recorridos/nuevo"
          className="mt-6 inline-flex rounded-full bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
        >
          Crear el primero
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {rows.map((item) => (
        <li key={item.id}>
          <Link
            href={`/recorridos/${item.id}`}
            className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-signal-teal/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl text-asphalt-50">{item.title}</h2>
              <StatusChip status={item.latestReportStatus} />
            </div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {item.location || "Sin ubicación"} ·{" "}
              {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
                new Date(item.createdAt),
              )}
            </p>
            <p className="mt-4 text-sm text-asphalt-100">
              {item.imageCount} foto{item.imageCount === 1 ? "" : "s"} · {item.potholeCount}{" "}
              bache{item.potholeCount === 1 ? "" : "s"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
