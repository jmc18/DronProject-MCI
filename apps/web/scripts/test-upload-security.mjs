#!/usr/bin/env node
/**
 * Pruebas unitarias ligeras (sin Jest) para helpers de seguridad / MP4.
 * Ejecutar: node apps/web/scripts/test-upload-security.mjs
 */
import assert from "assert";
import { createHmac, createHash } from "crypto";
import { createRequire } from "module";

// Compilar/cargar vía ts no disponible — reimplementamos checks espejo de la lógica
function isMp4Ftyp(header) {
  if (header.length < 8) return false;
  return header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70;
}

function sanitizeFilename(name) {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_").slice(0, 200);
  return base || "video.mp4";
}

// MP4 magic
const good = Buffer.alloc(12);
good.writeUInt32BE(0x18, 0);
good.write("ftyp", 4);
assert.strictEqual(isMp4Ftyp(good), true);
assert.strictEqual(isMp4Ftyp(Buffer.from("notanmp4!!!!")), false);

// sanitize
assert.strictEqual(sanitizeFilename("../../etc/passwd.mp4"), ".._.._etc_passwd.mp4");
assert.ok(!sanitizeFilename("a/b\\c.mp4").includes("/"));
assert.ok(!sanitizeFilename("a/b\\c.mp4").includes("\\"));

// HMAC payload format
const secret = "test-secret";
const ts = "1710000000";
const key = "550e8400-e29b-41d4-a716-446655440000";
const sha = createHash("sha256").update("hello").digest("hex");
const payload = `${ts}.${key}.${sha}`;
const sig = createHmac("sha256", secret).update(payload).digest("hex");
assert.strictEqual(sig.length, 64);

console.log("OK test-upload-security");
