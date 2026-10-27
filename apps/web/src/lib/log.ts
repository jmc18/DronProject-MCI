/** Línea JSON a stdout/stderr. systemd la deja en /var/log/bachedron/web.log. */
export function logInfo(event: string, fields: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ ts: new Date().toISOString(), level: "info", app: "web", event, ...fields }));
}

export function logError(event: string, err: unknown, fields: Record<string, unknown> = {}): void {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      app: "web",
      event,
      error: describeError(err),
      ...fields,
    }),
  );
}

export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause instanceof Error ? `: ${err.cause.message}` : "";
  return `${err.message}${cause}`;
}
