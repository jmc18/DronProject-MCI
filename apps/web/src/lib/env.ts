import path from "path";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getJobsDir(): string {
  const raw = process.env.JOBS_DIR
    ? process.env.JOBS_DIR
    : path.join(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"), "jobs");
  // Absoluta: el worker corre en otro directorio y no resuelve rutas relativas de Next.
  return path.resolve(raw);
}

export function getMaxUploadBytes(): number {
  return intEnv("MAX_UPLOAD_MB", 8192) * 1024 * 1024;
}

export function getMinFreeDiskBytes(): number {
  return floatEnv("MIN_FREE_DISK_GB", 20) * 1024 * 1024 * 1024;
}

export function getModelWhitelist(): string[] {
  const raw = process.env.MODEL_WHITELIST || "pothole_seg";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getDefaultModel(): string {
  const list = getModelWhitelist();
  return list[0] ?? "pothole_seg";
}

export function getHmacSecret(): string {
  return process.env.UPLOAD_HMAC_SECRET || process.env.API_KEY_CURRENT || "";
}

export function getInternalToken(): string {
  return process.env.INTERNAL_TOKEN || "";
}

export function getAnalyzerUrl(): string {
  return process.env.ANALYZER_URL || "http://127.0.0.1:8000";
}

export function getJobTimeoutMinutes(): number {
  return intEnv("JOB_TIMEOUT_MINUTES", 180);
}

export function getRetentionDays(): number {
  return intEnv("RETENTION_DAYS", 30);
}

export function getDeleteOriginalAfterDays(): number {
  return intEnv("DELETE_ORIGINAL_AFTER_DAYS", 7);
}

export function getRateLimitPerMinute(): number {
  return intEnv("RATE_LIMIT_PER_MINUTE", 30);
}
