import fs from "fs/promises";
import path from "path";
import { getJobsDir } from "@/lib/env";

const GENERATED = ["preview.mp4", "processed.mp4", "meta.json", "report.json"];

/** Resuelve el directorio del job y exige que viva bajo JOBS_DIR. */
export function resolveJobDir(storageDir: string): string {
  const resolved = path.resolve(storageDir);
  const root = path.resolve(getJobsDir());
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Directorio de job fuera de JOBS_DIR");
  }
  return resolved;
}

export function originalVideoPath(storageDir: string): string {
  return path.join(resolveJobDir(storageDir), "original.mp4");
}

export async function removeGeneratedArtifacts(storageDir: string): Promise<void> {
  const dir = resolveJobDir(storageDir);
  await Promise.all(
    GENERATED.map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined)),
  );
}

export async function removeJobDirectory(storageDir: string): Promise<void> {
  const dir = resolveJobDir(storageDir);
  await fs.rm(dir, { recursive: true, force: true });
}
