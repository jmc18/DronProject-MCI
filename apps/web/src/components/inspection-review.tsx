"use client";

import { useEffect, useMemo } from "react";
import { StatusChip } from "@/components/status-chip";
import { PotholeOverlay } from "@/components/pothole-overlay";
import type { InspectionReviewDto } from "@/domain/inspection-view";
import { inspectionApi } from "@/services/inspection-api";
import { useInspectionStore } from "@/stores/inspection-store";

export function InspectionReview({ inspection }: { inspection: InspectionReviewDto }) {
  const current = useInspectionStore((state) => state.current);
  const selectedImageId = useInspectionStore((state) => state.selectedImageId);
  const hydrateCurrent = useInspectionStore((state) => state.hydrateCurrent);
  const selectImage = useInspectionStore((state) => state.selectImage);

  useEffect(() => {
    hydrateCurrent(inspection);
  }, [hydrateCurrent, inspection]);

  const view = current?.id === inspection.id ? current : inspection;
  const selected = useMemo(
    () => view.images.find((image) => image.id === selectedImageId) ?? view.images[0],
    [view.images, selectedImageId],
  );

  const created = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(view.createdAt));

  if (!selected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-[color:var(--muted)]">
        Este recorrido aún no tiene fotografías.
      </div>
    );
  }

  const report = selected.report;
  const potholes = report?.potholes ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-signal-teal">Recorrido</p>
          <h1 className="mt-2 font-display text-4xl text-asphalt-50">{view.title}</h1>
          <p className="mt-2 text-[color:var(--muted)]">
            {view.location || "Ubicación no indicada"} · {created}
          </p>
        </div>
        <a
          href={inspectionApi.pdfUrl(view.id)}
          className="ui-button inline-flex items-center justify-center bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
        >
          Descargar informe PDF
        </a>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fotografías" value={String(view.images.length)} />
        <Stat label="Baches" value={String(view.potholeCount)} />
        <Stat label="Estado" value={view.status === "open" ? "Abierto" : view.status} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Análisis</dt>
          <dd className="mt-2">
            <StatusChip status={report?.status ?? null} />
          </dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ul className="flex gap-3 overflow-x-auto lg:flex-col">
          {view.images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => selectImage(image.id)}
                className={`block w-28 overflow-hidden rounded-xl border lg:w-full ${
                  image.id === selected.id
                    ? "border-signal-teal"
                    : "border-white/10 opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.mediaUrl}
                  alt={image.originalName ?? `Foto ${index + 1}`}
                  className="h-20 w-full object-cover"
                />
                <span className="flex items-center justify-between px-2 py-1 text-[11px] text-[color:var(--muted)]">
                  Foto {index + 1}
                  <StatusChip status={image.report?.status ?? null} />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-5">
          <PotholeOverlay
            src={selected.mediaUrl}
            alt={selected.originalName ?? "Fotografía aérea"}
            sampleFactor={report?.sampleFactor ?? 1}
            potholes={potholes}
            naturalWidth={report?.imageWidth}
            naturalHeight={report?.imageHeight}
          />

          {report?.warning ? (
            <p className="rounded-xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">
              {report.warning}
            </p>
          ) : null}

          {report?.status === "FAILED" ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {report.summary || "El análisis de esta foto falló."}
            </p>
          ) : potholes.length === 0 ? (
            <p className="text-[color:var(--muted)]">Esta foto no tiene baches detectados.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-[color:var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Confianza</th>
                    <th className="px-4 py-2 font-medium">Área (px)</th>
                    <th className="px-4 py-2 font-medium">Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {potholes.map((pothole, index) => (
                    <tr key={pothole.id} className="border-t border-white/5">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">
                        {pothole.confidence != null ? `${Math.round(pothole.confidence * 100)}%` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {pothole.areaPx != null ? Math.round(pothole.areaPx) : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[color:var(--muted)]">
                        {Math.round(pothole.bboxX ?? 0)}, {Math.round(pothole.bboxY ?? 0)},{" "}
                        {Math.round(pothole.bboxW ?? 0)}, {Math.round(pothole.bboxH ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-2 font-display text-2xl text-asphalt-50">{value}</dd>
    </div>
  );
}
