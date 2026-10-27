/**
 * Limpieza de *.part huérfanos al arrancar el servidor Next.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupOrphanPartFiles } = await import("@/lib/disk");
    const n = await cleanupOrphanPartFiles();
    if (n > 0) {
      console.info(`[instrumentation] removed ${n} orphan .part file(s)`);
    }
  }
}
