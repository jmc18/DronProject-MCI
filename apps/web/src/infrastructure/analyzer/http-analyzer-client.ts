import type { AnalyzerClient, AnalyzerResponse } from "@/domain/ports";

export class HttpAnalyzerClient implements AnalyzerClient {
  constructor(private readonly baseUrl: string) {}

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async analyze(image: Buffer, filename: string): Promise<AnalyzerResponse> {
    const form = new FormData();
    const bytes = new Uint8Array(image);
    form.append(
      "file",
      new Blob([bytes], { type: "image/jpeg" }),
      filename || "aerial.jpg",
    );

    const res = await fetch(`${this.baseUrl}/analyze`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Analyzer respondió ${res.status}: ${text}`);
    }

    return (await res.json()) as AnalyzerResponse;
  }
}
