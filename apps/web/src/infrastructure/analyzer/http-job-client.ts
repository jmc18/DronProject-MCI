import { getAnalyzerUrl, getInternalToken } from "@/lib/env";
import { describeError, logError, logInfo } from "@/lib/log";
import type { JobNotifier } from "@/domain/ports";

/** Notifica al worker local (INTERNAL_TOKEN). No envía el vídeo por la red. */
export class HttpJobClient implements JobNotifier {
  constructor(
    private readonly baseUrl = getAnalyzerUrl(),
    private readonly token = getInternalToken(),
  ) {}

  async enqueue(params: { jobId: string; path: string; model: string }): Promise<void> {
    const url = `${this.baseUrl}/internal/jobs`;
    logInfo("analyzer.enqueue", { url, jobId: params.jobId, model: params.model, path: params.path });
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": this.token,
        },
        body: JSON.stringify(params),
      });
    } catch (err) {
      logError("analyzer.enqueue", err, { url, jobId: params.jobId });
      throw new Error(`No hay conexión con el worker en ${url} (${describeError(err)})`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = new Error(`Worker rechazó el job (${res.status}): ${text.slice(0, 300)}`);
      logError("analyzer.enqueue", error, { url, jobId: params.jobId, status: res.status });
      throw error;
    }
    logInfo("analyzer.enqueued", { url, jobId: params.jobId, status: res.status });
  }
}
