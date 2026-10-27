import { getAnalyzerUrl, getInternalToken } from "@/lib/env";
import type { JobNotifier } from "@/domain/ports";

/** Notifica al worker local (INTERNAL_TOKEN). No envía el vídeo por la red. */
export class HttpJobClient implements JobNotifier {
  constructor(
    private readonly baseUrl = getAnalyzerUrl(),
    private readonly token = getInternalToken(),
  ) {}

  async enqueue(params: { jobId: string; path: string; model: string }): Promise<void> {
    const res = await fetch(`${this.baseUrl}/internal/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": this.token,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Worker rechazó el job (${res.status}): ${text.slice(0, 200)}`);
    }
  }
}
