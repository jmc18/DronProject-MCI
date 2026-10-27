import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { JobNotifier, VideoJobRepository } from "@/domain/ports";
import { getJobTimeoutMinutes } from "@/lib/env";
import { originalVideoPath, removeGeneratedArtifacts } from "@/lib/job-files";
import { describeError, logError, logInfo } from "@/lib/log";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  logInfo("reanalyze.start", { jobId: id });
  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const notifier = container.resolve<JobNotifier>(TOKENS.JobNotifier);
  const job = await jobs.findById(id);
  if (!job) {
    return NextResponse.json({ success: false, message: "Job no encontrado" }, { status: 404 });
  }
  if (job.status === "PROCESSING" || job.status === "QUEUED" || job.status === "VALIDATING") {
    return NextResponse.json(
      { success: false, message: "El análisis ya está en curso" },
      { status: 409 },
    );
  }

  const original = originalVideoPath(job.storageDir);
  try {
    await fs.access(original);
  } catch {
    return NextResponse.json(
      { success: false, message: "No se encontró original.mp4 para reanalizar" },
      { status: 400 },
    );
  }

  await removeGeneratedArtifacts(job.storageDir);
  const timeoutAt = new Date(Date.now() + getJobTimeoutMinutes() * 60_000);
  await jobs.update(id, {
    status: "QUEUED",
    progress: 0,
    meta: null,
    errorMessage: null,
    warning: null,
    timeoutAt,
  });

  try {
    await notifier.enqueue({ jobId: job.id, path: original, model: job.model });
  } catch (err) {
    const detail = describeError(err);
    logError("reanalyze.worker", err, { jobId: id });
    await jobs.update(id, {
      status: "FAILED",
      errorMessage: detail,
    });
    // 503, no 502: Cloudflare sustituye el 502 por su página y oculta este JSON.
    return NextResponse.json(
      { success: false, message: detail },
      { status: 503 },
    );
  }

  logInfo("reanalyze.queued", { jobId: id });
  return NextResponse.json({ success: true, message: "Análisis encolado de nuevo" });
}
