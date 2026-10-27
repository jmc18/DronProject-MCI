import Link from "next/link";
import { StackStatus } from "@/components/stack-status";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { AnalyzerClient, VideoJobRepository } from "@/domain/ports";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStatus() {
  const container = createAppContainer();
  const analyzer = container.resolve<AnalyzerClient>(TOKENS.AnalyzerClient);
  const videoJobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const jobs = database ? await videoJobs.list({ page: 1, pageSize: 15 }) : { items: [], total: 0 };
  const analyzerOk = await analyzer.health();

  return {
    health: {
      ok: database,
      app: process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones",
      checks: {
        database,
        analyzer: analyzerOk,
      },
    },
    recorridoCount: jobs.total,
    potholeCount: jobs.items.reduce((sum, j) => {
      const meta = (j.meta ?? {}) as { report?: { totalPotholes?: number } };
      return sum + (meta.report?.totalPotholes ?? 0);
    }, 0),
  };
}

export default async function HomePage() {
  const status = await getStatus();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center gap-10 px-4 py-10 sm:px-6 sm:py-16">
      <header className="space-y-4">
        <p className="font-orbitron text-sm uppercase tracking-[0.2em] text-signal-teal">
          DronProject-MCI
        </p>
        <h1 className="font-orbitron text-3xl leading-tight text-asphalt-50 sm:text-4xl md:text-5xl">
          {appName}
        </h1>
        <p className="max-w-xl text-lg text-[color:var(--muted)]">
          Sube vídeos MP4 (hasta 8K), revisa el progreso del análisis con tiling YOLO y
          reproduce el preview anotado en el navegador.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/videos/nuevo"
            className="ui-button bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
          >
            Subir vídeo
          </Link>
          <Link
            href="/videos"
            className="ui-button border border-white/15 px-5 py-2.5 text-sm text-asphalt-50"
          >
            Ver jobs
          </Link>
        </div>
      </header>

      <StackStatus initial={status} />
    </main>
  );
}
