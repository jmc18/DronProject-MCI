import { httpClient, type HttpClient } from "@/services/http";

export type HealthSnapshot = {
  ok: boolean;
  app: string;
  checks: {
    database: boolean;
    analyzer: boolean;
    mqttTopics: string[];
  };
};

export class HealthApiService {
  constructor(private readonly http: HttpClient) {}

  get(): Promise<HealthSnapshot> {
    return this.http.get<HealthSnapshot>("/api/health");
  }
}

export const healthApi = new HealthApiService(httpClient);
