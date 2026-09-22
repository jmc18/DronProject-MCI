import Link from "next/link";
import { InspectionList } from "@/components/inspection-list";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { toInspectionListItemDto } from "@/domain/inspection-view";
import type { InspectionRepository } from "@/domain/ports";

export const dynamic = "force-dynamic";

export default async function RecorridosPage() {
  const container = createAppContainer();
  const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
  const items = (await inspections.list()).map(toInspectionListItemDto);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-signal-teal">Análisis</p>
          <h1 className="mt-2 font-display text-4xl text-asphalt-50">Recorridos</h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Revisa fotografías, detecciones YOLO e informes de cada inspección.
          </p>
        </div>
        <Link
          href="/recorridos/nuevo"
          className="ui-button inline-flex bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
        >
          Nuevo recorrido
        </Link>
      </div>

      <InspectionList initial={items} />
    </main>
  );
}
