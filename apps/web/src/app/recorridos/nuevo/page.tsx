import { NewInspectionForm } from "@/components/new-inspection-form";

export default function NuevoRecorridoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.18em] text-signal-teal">Nuevo informe</p>
      <h1 className="mt-2 font-display text-4xl text-asphalt-50">Registrar recorrido</h1>
      <p className="mt-2 mb-8 text-[color:var(--muted)]">
        Las fotos se analizan con PDI/DSP + YOLOv8 y quedan listas para revisión y PDF.
      </p>
      <NewInspectionForm />
    </main>
  );
}
