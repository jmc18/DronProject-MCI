import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { IdempotencyRepository } from "@/domain/ports";
import { streamVideoUpload, UploadError } from "@/infrastructure/storage/job-upload-service";
import { assertEnoughDisk } from "@/lib/disk";
import { completeVideoUpload, uploadJson } from "@/lib/complete-video-upload";
import { getMaxUploadBytes } from "@/lib/env";
import { isUuid } from "@/lib/security/hmac";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

/**
 * Subida desde la UI local. No pide API key ni HMAC:
 * el hash se calcula en el servidor al guardar el archivo.
 * Raspberry Pi y ESP32 deben usar POST /api/videos/upload.
 */
export async function POST(request: Request) {
  const rl = checkRateLimit([`ip:${clientIp(request)}`, "manual"]);
  if (!rl.ok) {
    return uploadJson(429, { success: false, message: "Demasiadas solicitudes" });
  }

  const headerKey = request.headers.get("idempotency-key");
  const idempotencyKey = headerKey && isUuid(headerKey) ? headerKey : randomUUID();

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > getMaxUploadBytes()) {
      return uploadJson(413, { success: false, message: "Tamaño de archivo excedido" });
    }
  }

  try {
    await assertEnoughDisk();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOSPC") {
      return uploadJson(507, { success: false, message: "Espacio en disco insuficiente" });
    }
    return uploadJson(503, { success: false, message: "No se pudo verificar el espacio en disco" });
  }

  if (headerKey && isUuid(headerKey)) {
    const container = createAppContainer();
    const idempotency = container.resolve<IdempotencyRepository>(TOKENS.IdempotencyRepository);
    const existing = await idempotency.findByKey(headerKey);
    if (existing && existing.expiresAt >= new Date()) {
      return NextResponse.json(existing.responseBody as object, {
        status: existing.responseStatus,
      });
    }
    if (existing) await idempotency.deleteByKey(headerKey);
  }

  try {
    const upload = await streamVideoUpload(request);
    return completeVideoUpload(upload, idempotencyKey);
  } catch (err) {
    if (err instanceof UploadError) {
      if (err.code === "TOO_LARGE") {
        return uploadJson(413, { success: false, message: "Tamaño de archivo excedido" });
      }
      if (err.code === "SAVE_FAILED") {
        return uploadJson(500, { success: false, message: "No se pudo guardar el video" });
      }
      return uploadJson(400, { success: false, message: "El campo video es requerido" });
    }
    return uploadJson(500, { success: false, message: "No se pudo guardar el video" });
  }
}
