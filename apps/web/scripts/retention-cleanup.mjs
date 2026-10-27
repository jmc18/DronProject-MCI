#!/usr/bin/env node
/**
 * Limpieza de retención de jobs de vídeo.
 * Uso: node apps/web/scripts/retention-cleanup.mjs [--dry-run]
 *
 * RETENTION_DAYS: borra job completo (dir + fila) más antiguo.
 * DELETE_ORIGINAL_AFTER_DAYS: solo borra original.mp4 conservando preview/processed/report.
 */
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const retentionDays = Number(process.env.RETENTION_DAYS || "30");
const deleteOriginalAfter = Number(process.env.DELETE_ORIGINAL_AFTER_DAYS || "7");
const jobsDir = process.env.JOBS_DIR || path.join(process.cwd(), "uploads", "jobs");

const prisma = new PrismaClient();

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const originalCutoff = daysAgo(deleteOriginalAfter);
  const fullCutoff = daysAgo(retentionDays);

  const jobs = await prisma.videoJob.findMany({ orderBy: { createdAt: "asc" } });
  let originalsRemoved = 0;
  let jobsRemoved = 0;

  for (const job of jobs) {
    if (job.createdAt < fullCutoff) {
      console.log(`${dryRun ? "[dry-run] " : ""}DELETE job ${job.id} (${job.originalFilename})`);
      if (!dryRun) {
        await fs.rm(job.storageDir, { recursive: true, force: true }).catch(() => undefined);
        await prisma.videoJob.delete({ where: { id: job.id } }).catch(() => undefined);
      }
      jobsRemoved += 1;
      continue;
    }

    if (job.createdAt < originalCutoff) {
      const original = path.join(job.storageDir, "original.mp4");
      try {
        await fs.access(original);
        console.log(`${dryRun ? "[dry-run] " : ""}DELETE original ${job.id}`);
        if (!dryRun) await fs.unlink(original);
        originalsRemoved += 1;
      } catch {
        /* already gone */
      }
    }
  }

  // Limpieza .part huérfanos
  try {
    const entries = await fs.readdir(jobsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(jobsDir, e.name);
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (f.endsWith(".part")) {
          console.log(`${dryRun ? "[dry-run] " : ""}DELETE orphan ${path.join(dir, f)}`);
          if (!dryRun) await fs.unlink(path.join(dir, f)).catch(() => undefined);
        }
      }
    }
  } catch {
    /* ignore */
  }

  console.log(`Done. originals=${originalsRemoved} jobs=${jobsRemoved} dryRun=${dryRun}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
