import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { VideoJobRepository } from "@/domain/ports";

export const dynamic = "force-dynamic";

function jobMeta(raw: unknown) {
  const meta = (raw ?? {}) as Record<string, unknown>;
  return {
    res:
      typeof meta.width === "number" && typeof meta.height === "number"
        ? `${meta.width}×${meta.height}`
        : "—",
    codec: typeof meta.codec === "string" ? meta.codec : "—",
    dur: typeof meta.duration_sec === "number" ? `${meta.duration_sec.toFixed(1)}s` : "—",
  };
}

function formatBytes(raw: bigint | null | undefined): string {
  if (raw == null) return "—";
  const n = Number(raw);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const { items, total } = await jobs.list({ page, pageSize: 15 });
  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-orbitron text-xs uppercase tracking-[0.2em] text-signal-teal">
            Jobs de vídeo
          </p>
          <h1 className="mt-2 font-orbitron text-2xl text-asphalt-50 sm:text-3xl">Análisis MP4</h1>
          <p className="mt-2 max-w-xl text-[color:var(--muted)]">
            Listado paginado (máx. 15). El procesamiento 8K puede tardar varios minutos.
          </p>
        </div>
        <Link
          href="/videos/nuevo"
          className="ui-button bg-signal-teal px-4 py-2 text-sm font-medium text-asphalt-50"
        >
          Subir vídeo
        </Link>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.length === 0 ? (
          <li className="border border-white/10 px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            No hay jobs todavía.
          </li>
        ) : (
          items.map((job) => {
            const meta = jobMeta(job.meta);
            return (
              <li key={job.id} className="space-y-3 border border-white/10 p-4 text-sm">
                <p className="break-words font-medium">{job.originalFilename}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[color:var(--muted)]">
                  <div>
                    <dt>Estado</dt>
                    <dd className="text-asphalt-50">{job.status}</dd>
                  </div>
                  <div>
                    <dt>Progreso</dt>
                    <dd className="text-asphalt-50">{Math.round(job.progress)}%</dd>
                  </div>
                  <div>
                    <dt>Tamaño</dt>
                    <dd className="text-asphalt-50">{formatBytes(job.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt>Meta</dt>
                    <dd className="break-words text-asphalt-50">
                      {meta.res} · {meta.codec} · {meta.dur}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/videos/${job.id}`} className="text-signal-teal hover:underline">
                    Ver
                  </Link>
                  <JobActions
                    jobId={job.id}
                    filename={job.originalFilename}
                    busy={job.status === "PROCESSING" || job.status === "QUEUED" || job.status === "VALIDATING"}
                  />
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="hidden overflow-x-auto border border-white/10 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[color:var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Archivo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Progreso</th>
              <th className="px-3 py-2 font-medium">Meta</th>
              <th className="px-3 py-2 font-medium">Tamaño</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[color:var(--muted)]">
                  No hay jobs todavía.
                </td>
              </tr>
            ) : (
              items.map((job) => {
                const meta = jobMeta(job.meta);
                return (
                  <tr key={job.id} className="border-t border-white/10">
                    <td className="max-w-[16rem] break-words px-3 py-2">{job.originalFilename}</td>
                    <td className="px-3 py-2">{job.status}</td>
                    <td className="px-3 py-2">{Math.round(job.progress)}%</td>
                    <td className="px-3 py-2 text-[color:var(--muted)]">
                      {meta.res} · {meta.codec} · {meta.dur}
                    </td>
                    <td className="px-3 py-2">{formatBytes(job.sizeBytes)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Link href={`/videos/${job.id}`} className="text-signal-teal hover:underline">
                          Ver
                        </Link>
                        <JobActions
                          jobId={job.id}
                          filename={job.originalFilename}
                          busy={job.status === "PROCESSING" || job.status === "QUEUED" || job.status === "VALIDATING"}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
        <span>
          Página {page} / {pages} · {total} jobs
        </span>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link href={`/videos?page=${page - 1}`} className="hover:text-asphalt-50">
              Anterior
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={`/videos?page=${page + 1}`} className="hover:text-asphalt-50">
              Siguiente
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
