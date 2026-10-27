import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { getJobsDir, getMinFreeDiskBytes } from "@/lib/env";

const execFileAsync = promisify(execFile);

export async function getFreeDiskBytes(dir: string): Promise<number> {
  await fs.mkdir(dir, { recursive: true });

  if (process.platform === "win32") {
    const resolved = path.resolve(dir);
    const root = path.parse(resolved).root.replace(/\\$/, "");
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      `(Get-PSDrive -Name '${root.replace(":", "")}').Free`,
    ]);
    const n = Number(String(stdout).trim());
    if (!Number.isFinite(n)) throw new Error("No se pudo leer espacio libre");
    return n;
  }

  const { stdout } = await execFileAsync("df", ["-k", dir]);
  const lines = stdout.trim().split("\n");
  const parts = lines[lines.length - 1]?.split(/\s+/) ?? [];
  // df -k: Filesystem 1K-blocks Used Available Use% Mounted
  const availKb = Number(parts[3]);
  if (!Number.isFinite(availKb)) throw new Error("No se pudo leer espacio libre");
  return availKb * 1024;
}

export async function assertEnoughDisk(): Promise<void> {
  const jobsDir = getJobsDir();
  const free = await getFreeDiskBytes(jobsDir);
  const min = getMinFreeDiskBytes();
  if (free < min) {
    const err = new Error("Espacio en disco insuficiente");
    (err as Error & { code: string }).code = "ENOSPC";
    throw err;
  }
}

/** Elimina archivos *.part huérfanos bajo JOBS_DIR. */
export async function cleanupOrphanPartFiles(): Promise<number> {
  const jobsDir = getJobsDir();
  let removed = 0;
  try {
    await fs.mkdir(jobsDir, { recursive: true });
    const entries = await fs.readdir(jobsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(jobsDir, entry.name);
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (f.endsWith(".part")) {
          await fs.unlink(path.join(dir, f)).catch(() => undefined);
          removed += 1;
        }
      }
    }
  } catch {
    // ignore
  }
  return removed;
}
