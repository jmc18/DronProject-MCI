"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "reanalyze" | "delete";

type Props = {
  jobId: string;
  filename: string;
  busy?: boolean;
  /** Tras borrar, volver al listado. */
  redirectOnDelete?: boolean;
};

export function JobActions({ jobId, filename, busy = false, redirectOnDelete = false }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (pending) return;
    setMode(null);
    setError("");
  };

  const confirm = async () => {
    if (!mode) return;
    setPending(true);
    setError("");
    try {
      const res =
        mode === "delete"
          ? await fetch(`/api/videos/${jobId}`, { method: "DELETE" })
          : await fetch(`/api/videos/${jobId}/reanalyze`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message || "No se pudo completar la acción");
        setPending(false);
        return;
      }
      setMode(null);
      if (mode === "delete" && redirectOnDelete) {
        router.push("/videos");
        router.refresh();
        return;
      }
      if (mode === "reanalyze") {
        window.location.reload();
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red");
      setPending(false);
    }
  };

  const copy =
    mode === "delete"
      ? {
          title: "Eliminar corrida",
          body: `Se borrará «${filename}» y todos sus archivos en disco: original, vista previa y vídeo procesado. No se puede deshacer.`,
          action: "Eliminar",
        }
      : {
          title: "Reanalizar",
          body: `Se volverá a analizar «${filename}». Se reemplazan el vídeo procesado y las estadísticas. El original se conserva.`,
          action: "Reanalizar",
        };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || pending}
          onClick={() => {
            setError("");
            setMode("reanalyze");
          }}
          className="ui-button border border-white/20 px-3 py-1.5 text-sm text-asphalt-50 disabled:opacity-40"
        >
          Reanalizar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError("");
            setMode("delete");
          }}
          className="ui-button border border-red-400/40 px-3 py-1.5 text-sm text-red-200 disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>

      {mode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-action-title"
            className="w-full max-w-md border border-white/15 bg-[#12181f] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="job-action-title" className="font-orbitron text-lg text-asphalt-50">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm text-[color:var(--muted)]">{copy.body}</p>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="ui-button border border-white/20 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={pending}
                className={
                  mode === "delete"
                    ? "ui-button bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    : "ui-button bg-signal-teal px-4 py-2 text-sm font-medium text-asphalt-50 disabled:opacity-50"
                }
              >
                {pending ? "Espera…" : copy.action}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
