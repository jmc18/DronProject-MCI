import { createHmac, timingSafeEqual } from "crypto";
import { getHmacSecret } from "@/lib/env";

const WINDOW_MS = 5 * 60 * 1000;

export type HmacVerifyResult =
  | { ok: true; contentSha256: string; timestamp: string; idempotencyKey: string }
  | { ok: false; message: string };

/**
 * Firma HMAC-SHA256 sobre: `${timestamp}.${Idempotency-Key}.${sha256}`
 * Headers: x-timestamp, x-signature, x-content-sha256; Idempotency-Key.
 */
export function verifyUploadHmac(request: Request): HmacVerifyResult {
  const secret = getHmacSecret();
  if (!secret) {
    return { ok: false, message: "API key inválida" };
  }

  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-signature");
  const contentSha256 = request.headers.get("x-content-sha256");
  const idempotencyKey = request.headers.get("idempotency-key");

  if (!timestamp || !signature || !contentSha256 || !idempotencyKey) {
    return { ok: false, message: "API key inválida" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, message: "API key inválida" };
  }

  const now = Date.now();
  // Acepta segundos o milisegundos
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  if (Math.abs(now - tsMs) > WINDOW_MS) {
    return { ok: false, message: "API key inválida" };
  }

  if (!/^[0-9a-f]{64}$/i.test(contentSha256)) {
    return { ok: false, message: "API key inválida" };
  }

  const payload = `${timestamp}.${idempotencyKey}.${contentSha256.toLowerCase()}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.toLowerCase(), "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "API key inválida" };
    }
  } catch {
    return { ok: false, message: "API key inválida" };
  }

  return {
    ok: true,
    contentSha256: contentSha256.toLowerCase(),
    timestamp,
    idempotencyKey,
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
