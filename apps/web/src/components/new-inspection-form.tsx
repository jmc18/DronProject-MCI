"use client";

import { useRouter } from "next/navigation";
import { ImageDropzone } from "@/components/image-dropzone";
import { useNewInspectionStore } from "@/stores/new-inspection-store";

export function NewInspectionForm() {
  const router = useRouter();
  const title = useNewInspectionStore((state) => state.title);
  const location = useNewInspectionStore((state) => state.location);
  const files = useNewInspectionStore((state) => state.files);
  const busy = useNewInspectionStore((state) => state.busy);
  const error = useNewInspectionStore((state) => state.error);
  const progress = useNewInspectionStore((state) => state.progress);
  const setTitle = useNewInspectionStore((state) => state.setTitle);
  const setLocation = useNewInspectionStore((state) => state.setLocation);
  const setFiles = useNewInspectionStore((state) => state.setFiles);
  const submit = useNewInspectionStore((state) => state.submit);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const inspectionId = await submit();
      router.push(`/recorridos/${inspectionId}`);
      router.refresh();
    } catch {
      // El store ya guarda el mensaje de error o validación.
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm text-[color:var(--muted)]">
            Título del recorrido
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tramo norte, avenida principal"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-signal-teal focus:ring-2"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-[color:var(--muted)]">
            Ubicación (opcional)
          </span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Colonia, km o coordenadas"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-signal-teal focus:ring-2"
          />
        </label>
      </div>

      <ImageDropzone files={files} onChange={setFiles} />

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {progress ? <p className="text-sm text-signal-teal">{progress}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="ui-button bg-signal-teal px-6 py-2.5 text-sm font-medium text-asphalt-50 disabled:opacity-60"
      >
        {busy ? "Procesando…" : "Crear y analizar"}
      </button>
    </form>
  );
}
