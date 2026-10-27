import { timingSafeEqual } from "crypto";

/**
 * Compara API keys con timing-safe equal.
 * Acepta API_KEY_CURRENT y, si existe, API_KEY_PREVIOUS (rotación).
 */
export function verifyApiKey(provided: string | null): boolean {
  if (!provided) return false;

  const current = process.env.API_KEY_CURRENT ?? "";
  const previous = process.env.API_KEY_PREVIOUS ?? "";

  const candidates = [current, previous].filter((k) => k.length > 0);
  if (candidates.length === 0) return false;

  const providedBuf = Buffer.from(provided);
  for (const candidate of candidates) {
    const candBuf = Buffer.from(candidate);
    if (providedBuf.length !== candBuf.length) continue;
    try {
      if (timingSafeEqual(providedBuf, candBuf)) return true;
    } catch {
      // length mismatch already guarded
    }
  }
  return false;
}

export function requireApiKeyHeader(request: Request): { ok: true } | { ok: false; status: 401; body: { success: false; message: string } } {
  const key = request.headers.get("x-api-key");
  if (!verifyApiKey(key)) {
    return {
      ok: false,
      status: 401,
      body: { success: false, message: "API key inválida" },
    };
  }
  return { ok: true };
}
