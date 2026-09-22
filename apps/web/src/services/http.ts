export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Cliente HTTP mínimo para el browser. Las rutas /api/* siguen usando
 * independent tokens en el servidor.
 */
export class HttpClient {
  constructor(private readonly baseUrl = "") {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const isForm = options.body instanceof FormData;
    if (options.body && !isForm && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });

    const payload = await readJson(res);
    if (!res.ok) {
      const message =
        (payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : null) || `Error ${res.status}`;
      throw new ApiError(message, res.status);
    }

    return payload as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET", cache: "no-store" });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export const httpClient = new HttpClient();
