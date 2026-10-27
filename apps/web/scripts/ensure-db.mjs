#!/usr/bin/env node
/**
 * Aplica migraciones pendientes al arrancar (equivalente a Database.Migrate() en EF Core).
 * Usa `prisma migrate deploy` (seguro, no interactivo; no crea migraciones nuevas).
 *
 * Desactivar: AUTO_MIGRATE=0
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as sleep } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

if (process.env.AUTO_MIGRATE === "0" || process.env.AUTO_MIGRATE === "false") {
  console.info("[ensure-db] AUTO_MIGRATE desactivado — omitiendo migrate deploy");
  process.exit(0);
}

const maxAttempts = Number(process.env.PRISMA_MIGRATE_RETRIES || 30);
const delayMs = Number(process.env.PRISMA_MIGRATE_RETRY_MS || 2000);

function runMigrate() {
  const result = spawnSync(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: webRoot,
      env: process.env,
      stdio: "inherit",
      shell: true,
    },
  );
  return result.status === 0;
}

console.info("[ensure-db] Aplicando migraciones Prisma (migrate deploy)…");

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  if (runMigrate()) {
    console.info("[ensure-db] Migraciones al día.");
    process.exit(0);
  }
  if (attempt < maxAttempts) {
    console.warn(
      `[ensure-db] Intento ${attempt}/${maxAttempts} falló (¿Postgres aún arrancando?). Reintento en ${delayMs}ms…`,
    );
    await sleep(delayMs);
  }
}

console.error("[ensure-db] No se pudieron aplicar migraciones tras varios intentos.");
process.exit(1);
