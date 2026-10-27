import path from "path";
import { rm } from "fs/promises";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { IdempotencyRepository, JobNotifier, VideoJobRepository } from "@/domain/ports";
import type { StreamUploadResult } from "@/infrastructure/storage/job-upload-service";
import { getDefaultModel, getJobTimeoutMinutes, getModelWhitelist } from "@/lib/env";

export function uploadJson(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/**
 * Crea el job, guarda la idempotencia y avisa al worker.
 * Compartido por el upload de dispositivos y el de la UI local.
 */
export async function completeVideoUpload(
  upload: StreamUploadResult,
  idempotencyKey: string,
): Promise<NextResponse> {
  const whitelist = getModelWhitelist();
  let model = upload.modelField?.trim() || getDefaultModel();
  if (upload.modelField && !whitelist.includes(model)) {
    await rm(upload.storageDir, { recursive: true, force: true }).catch(() => undefined);
    return uploadJson(400, { success: false, message: "El campo video es requerido" });
  }
  if (!whitelist.includes(model)) model = getDefaultModel();

  const responseBody = {
    success: true as const,
    message: "Video recibido correctamente",
    filename: upload.originalFilename,
    jobId: upload.jobId,
  };

  const container = createAppContainer();
  const idempotency = container.resolve<IdempotencyRepository>(TOKENS.IdempotencyRepository);
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const notifier = container.resolve<JobNotifier>(TOKENS.JobNotifier);

  try {
    const timeoutAt = new Date(Date.now() + getJobTimeoutMinutes() * 60_000);
    await jobs.create({
      id: upload.jobId,
      originalFilename: upload.originalFilename,
      storageDir: upload.storageDir,
      model,
      contentSha256: upload.contentSha256,
      sizeBytes: BigInt(upload.sizeBytes),
      status: "QUEUED",
      timeoutAt,
    });

    try {
      await idempotency.create({
        key: idempotencyKey,
        contentSha256: upload.contentSha256,
        responseStatus: 200,
        responseBody,
        jobId: upload.jobId,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const race = await idempotency.findByKey(idempotencyKey);
        if (race && race.contentSha256 === upload.contentSha256) {
          return NextResponse.json(race.responseBody as object, { status: race.responseStatus });
        }
        return uploadJson(409, {
          success: false,
          message: "Idempotency-Key reutilizada con contenido distinto",
        });
      }
      throw err;
    }

    try {
      await notifier.enqueue({
        jobId: upload.jobId,
        path: path.resolve(upload.absoluteOriginal),
        model,
      });
    } catch {
      await jobs.update(upload.jobId, {
        status: "FAILED",
        errorMessage: "No se pudo notificar al worker",
      });
    }

    return uploadJson(200, responseBody);
  } catch {
    await rm(upload.storageDir, { recursive: true, force: true }).catch(() => undefined);
    return uploadJson(500, { success: false, message: "No se pudo guardar el video" });
  }
}
