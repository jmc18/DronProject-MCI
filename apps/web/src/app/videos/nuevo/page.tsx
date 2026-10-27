"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadVideoWithProgress } from "@/lib/upload-client";

const maxMb = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || "8192");

export default function NuevoVideoPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "upload" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage("Selecciona un vídeo MP4.");
      setPhase("error");
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setMessage(`El archivo supera el límite de ${maxMb} MB.`);
      setPhase("error");
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("upload");
    setProgress(0);
    setMessage("Subiendo…");

    try {
      const result = await uploadVideoWithProgress({
        file,
        signal: ac.signal,
        onProgress: (p) => {
          setProgress(p.percent);
          setMessage(`Subiendo ${p.percent}%`);
        },
      });

      if (!result.success || !result.jobId) {
        setPhase("error");
        setMessage(result.message || "Upload fallido");
        return;
      }
      setPhase("done");
      setMessage(result.message);
      router.push(`/videos/${result.jobId}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setPhase("idle");
        setMessage("Upload cancelado. No se creó job.");
        return;
      }
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/videos" className="text-sm text-signal-teal hover:underline">
        ← Jobs
      </Link>
      <h1 className="mt-4 font-orbitron text-2xl text-asphalt-50 sm:text-3xl">Subir vídeo MP4</h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Subida local desde este equipo, hasta {maxMb} MB. El procesamiento 8K puede tardar.
        La API key y la firma HMAC las exigen solo los envíos de la Raspberry Pi y el ESP32.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="text-[color:var(--muted)]">Vídeo (.mp4)</span>
          <input
            type="file"
            accept="video/mp4,.mp4"
            className="mt-1 block w-full max-w-full text-sm"
            onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
          />
        </label>

        {phase === "upload" && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-[color:var(--muted)]">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/10">
              <div className="h-2 bg-signal-teal" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {message && phase !== "upload" ? (
          <p className="text-sm text-[color:var(--muted)]">{message}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={phase === "upload"}
            className="ui-button bg-signal-teal px-4 py-2 text-sm font-medium text-asphalt-50 disabled:opacity-50"
          >
            Subir
          </button>
          {phase === "upload" && (
            <button
              type="button"
              className="ui-button border border-white/20 px-4 py-2 text-sm"
              onClick={() => abortRef.current?.abort()}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
