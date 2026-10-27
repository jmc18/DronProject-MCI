/**
 * Valida magic number MP4: bytes 4..7 === 'ftyp' (ISO BMFF).
 */
export function isMp4Ftyp(header: Buffer): boolean {
  if (header.length < 8) return false;
  return (
    header[4] === 0x66 && // f
    header[5] === 0x74 && // t
    header[6] === 0x79 && // y
    header[7] === 0x70 // p
  );
}

/** Sanitiza nombre de archivo conservando extensión razonable. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_").slice(0, 200);
  return base || "video.mp4";
}
