import Link from "next/link";
import { notFound } from "next/navigation";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { VideoJobRepository } from "@/domain/ports";
import { JobActions } from "@/components/job-actions";
import { JobProgressClient } from "@/components/job-progress-client";

export const dynamic = "force-dynamic";

export default async function VideoJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const job = await jobs.findById(id);
  if (!job) notFound();

  const meta = (job.meta ?? {}) as Record<string, unknown>;
  const report = (meta.report ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <div>
        <Link href="/videos" className="text-sm text-signal-teal hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-3 font-orbitron text-3xl text-asphalt-50">{job.originalFilename}</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          {job.status} · modelo {job.model}
          {job.warning ? ` · aviso: ${job.warning}` : ""}
        </p>
        <div className="mt-4">
          <JobActions
            jobId={job.id}
            filename={job.originalFilename}
            redirectOnDelete
            busy={job.status === "PROCESSING" || job.status === "QUEUED" || job.status === "VALIDATING"}
          />
        </div>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,36rem)]">
      <div className="space-y-6">
      <JobProgressClient jobId={job.id} initialStatus={job.status} initialProgress={job.progress} />

      <section className="grid gap-4 border border-white/10 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[color:var(--muted)]">Resolución</p>
          <p>
            {typeof meta.width === "number" ? `${meta.width}×${meta.height}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Códec</p>
          <p>{typeof meta.codec === "string" ? meta.codec : "—"}</p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Duración / FPS</p>
          <p>
            {typeof meta.duration_sec === "number" ? `${meta.duration_sec.toFixed(1)}s` : "—"}
            {" / "}
            {typeof meta.fps === "number" ? meta.fps.toFixed(2) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Tamaño</p>
          <p>
            {job.sizeBytes != null
              ? `${(Number(job.sizeBytes) / 1024 / 1024).toFixed(1)} MB`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Daño medio / máximo</p>
          <p>
            {typeof report.meanDamagePercent === "number" ? `${report.meanDamagePercent.toFixed(2)}%` : "—"}
            {" / "}
            {typeof report.maxDamagePercent === "number" ? `${report.maxDamagePercent.toFixed(2)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Frames con daño / máscaras</p>
          <p>
            {typeof report.framesWithDamage === "number" ? report.framesWithDamage : "—"}
            {" / "}
            {typeof report.totalMasks === "number" ? report.totalMasks : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Baches únicos / detecciones</p>
          <p>
            {typeof report.totalPotholes === "number" ? report.totalPotholes : "—"}
            {" / "}
            {typeof report.totalDetections === "number" ? report.totalDetections : "—"}
          </p>
        </div>
        <div>
          <p className="text-[color:var(--muted)]">Device worker</p>
          <p>{typeof report.device === "string" ? report.device : "—"}</p>
        </div>
      </section>

      {job.errorMessage ? (
        <p className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {job.errorMessage}
        </p>
      ) : null}
      </div>

      <div className="w-full max-w-xl space-y-8">
      <section className="space-y-4">
        <h2 className="font-orbitron text-lg">Video original</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Reproducción en H.264. El archivo original se descarga aparte.
        </p>
        <video
          className="w-full border border-white/10 bg-black"
          controls
          src={`/api/videos/${job.id}/file?name=preview`}
        />
        <a
          className="inline-block text-sm text-signal-teal hover:underline"
          href={`/api/videos/${job.id}/file?name=original&download=1`}
        >
          Descargar original.mp4
        </a>
      </section>

      <section className="space-y-4">
        <h2 className="font-orbitron text-lg">Video procesado</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Máscaras de segmentación y porcentaje de daño sobre los fotogramas analizados.
        </p>
        {job.status === "COMPLETED" ? (
          <video
            className="w-full border border-white/10 bg-black"
            controls
            src={`/api/videos/${job.id}/file?name=processed`}
          />
        ) : (
          <p className="text-sm text-[color:var(--muted)]">Disponible cuando el análisis termine.</p>
        )}
      </section>
      </div>
      </div>
    </main>
  );
}
