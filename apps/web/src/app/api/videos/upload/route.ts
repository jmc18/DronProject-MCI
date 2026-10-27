import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { IdempotencyRepository } from "@/domain/ports";
import { streamVideoUpload, UploadError } from "@/infrastructure/storage/job-upload-service";
import { assertEnoughDisk } from "@/lib/disk";
import { completeVideoUpload, uploadJson } from "@/lib/complete-video-upload";
import { getMaxUploadBytes } from "@/lib/env";
import { requireApiKeyHeader } from "@/lib/security/api-key";
import { isUuid, verifyUploadHmac } from "@/lib/security/hmac";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

/**
 * Contrato de dispositivos (Raspberry Pi / ESP32).
 * Exige x-api-key, firma HMAC e Idempotency-Key.
 * La UI local usa POST /api/videos/upload/manual y no envía secretos.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key") ?? "";
  const rl = checkRateLimit([`ip:${clientIp(request)}`, `key:${apiKey.slice(0, 8)}`]);
  if (!rl.ok) {
    return uploadJson(429, { success: false, message: "Demasiadas solicitudes" });
  }

  const auth = requireApiKeyHeader(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const hmac = verifyUploadHmac(request);
  if (!hmac.ok) {
    return uploadJson(401, { success: false, message: hmac.message });
  }

  if (!isUuid(hmac.idempotencyKey)) {
    return uploadJson(400, { success: false, message: "El campo video es requerido" });
  }

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

  const container = createAppContainer();
  const idempotency = container.resolve<IdempotencyRepository>(TOKENS.IdempotencyRepository);

  const existing = await idempotency.findByKey(hmac.idempotencyKey);
  if (existing && existing.expiresAt >= new Date()) {
    if (existing.contentSha256 !== hmac.contentSha256) {
      return uploadJson(409, {
        success: false,
        message: "Idempotency-Key reutilizada con contenido distinto",
      });
    }
    return NextResponse.json(existing.responseBody as object, {
      status: existing.responseStatus,
    });
  }
  if (existing && existing.expiresAt < new Date()) {
    await idempotency.deleteByKey(hmac.idempotencyKey);
  }

  try {
    const upload = await streamVideoUpload(request, hmac.contentSha256);
    return completeVideoUpload(upload, hmac.idempotencyKey);
  } catch (err) {
    if (err instanceof UploadError) {
      if (err.code === "TOO_LARGE") {
        return uploadJson(413, { success: false, message: "Tamaño de archivo excedido" });
      }
      if (err.code === "HASH_MISMATCH") {
        return uploadJson(401, { success: false, message: "API key inválida" });
      }
      if (err.code === "SAVE_FAILED") {
        return uploadJson(500, { success: false, message: "No se pudo guardar el video" });
      }
      return uploadJson(400, { success: false, message: "El campo video es requerido" });
    }
    return uploadJson(500, { success: false, message: "No se pudo guardar el video" });
  }
}
