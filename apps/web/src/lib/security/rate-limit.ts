import { getRateLimitPerMinute } from "@/lib/env";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limit en memoria por clave (IP y/o API key).
 * Suficiente para un solo proceso Node; en multi-réplica usar Redis.
 */
export function checkRateLimit(keys: string[]): { ok: true } | { ok: false } {
  const limit = getRateLimitPerMinute();
  const now = Date.now();
  const windowMs = 60_000;

  for (const key of keys) {
    if (!key) continue;
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return { ok: false };
    }
  }

  // Evitar crecimiento ilimitado
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }

  return { ok: true };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
