import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { IdempotencyRepository, VideoJobRepository } from "@/domain/ports";
import { removeJobDirectory } from "@/lib/job-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const job = await jobs.findById(id);
  if (!job) {
    return NextResponse.json({ success: false, message: "Job no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    job: {
      ...job,
      sizeBytes: job.sizeBytes != null ? job.sizeBytes.toString() : null,
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const idempotency = container.resolve<IdempotencyRepository>(TOKENS.IdempotencyRepository);
  const job = await jobs.findById(id);
  if (!job) {
    return NextResponse.json({ success: false, message: "Job no encontrado" }, { status: 404 });
  }

  await removeJobDirectory(job.storageDir).catch(() => undefined);
  await idempotency.deleteByJobId(id);
  await jobs.delete(id);

  return NextResponse.json({ success: true, message: "Corrida eliminada" });
}
