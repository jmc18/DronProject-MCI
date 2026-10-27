import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { AnalyzerClient, VideoJobRepository } from "@/domain/ports";
import { getFreeDiskBytes } from "@/lib/disk";
import { getJobsDir } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  const analyzerOk = await analyzer.health();
  let diskFreeBytes: number | null = null;
  let jobsBytes: number | null = null;
  try {
    diskFreeBytes = await getFreeDiskBytes(getJobsDir());
    jobsBytes = await dirSize(getJobsDir());
  } catch {
    /* ignore */
  }

  let jobCounts = { total: 0, processing: 0, completed: 0, failed: 0 };
  if (database) {
    const { items, total } = await videoJobs.list({ page: 1, pageSize: 15 });
    jobCounts = {
      total,
      processing: items.filter((j) => j.status === "PROCESSING" || j.status === "QUEUED").length,
      completed: items.filter((j) => j.status === "COMPLETED").length,
      failed: items.filter((j) => j.status === "FAILED").length,
    };
  }

  return NextResponse.json({
    ok: database,
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones",
    checks: {
      database,
      analyzer: analyzerOk,
    },
    disk: {
      freeBytes: diskFreeBytes,
      jobsUsedBytes: jobsBytes,
    },
    videoJobs: jobCounts,
  });
}

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) total += await dirSize(p);
      else {
        const st = await fs.stat(p);
        total += st.size;
      }
    }
  } catch {
    return total;
  }
  return total;
}
