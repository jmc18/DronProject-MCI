import type { ReportStatus } from "@prisma/client";

const LABELS: Record<ReportStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Analizando",
  COMPLETED: "Completado",
  FAILED: "Fallido",
};

const TONES: Record<ReportStatus, string> = {
  PENDING: "bg-white/10 text-asphalt-100",
  PROCESSING: "bg-signal-amber/20 text-signal-amber",
  COMPLETED: "bg-signal-teal/20 text-signal-teal",
  FAILED: "bg-red-500/20 text-red-300",
};

export function StatusChip({ status }: { status: ReportStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-[color:var(--muted)]">
        Sin análisis
      </span>
    );
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${TONES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
