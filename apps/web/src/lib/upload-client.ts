/**
 * Subida manual desde la UI. No envía API key ni HMAC:
 * esas credenciales las exige solo POST /api/videos/upload (Pi / ESP32).
 */

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type UploadResult = {
  success: boolean;
  message: string;
  filename?: string;
  jobId?: string;
};

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function uploadVideoWithProgress(params: {
  file: File;
  model?: string;
  idempotencyKey?: string;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const maxMb = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || "8192");
  if (params.file.size > maxMb * 1024 * 1024) {
    return Promise.resolve({ success: false, message: `El archivo supera ${maxMb} MB` });
  }

  const idempotencyKey = params.idempotencyKey || createIdempotencyKey();
  const form = new FormData();
  form.append("video", params.file, params.file.name);
  if (params.model) form.append("model", params.model);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload/manual");
    xhr.setRequestHeader("Idempotency-Key", idempotencyKey);

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      params.onProgress?.({
        loaded: ev.loaded,
        total: ev.total,
        percent: Math.round((ev.loaded / ev.total) * 100),
      });
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as UploadResult;
        resolve(body);
      } catch {
        resolve({ success: false, message: `Respuesta inválida (${xhr.status})` });
      }
    };
    xhr.onerror = () => reject(new Error("Error de red durante el upload"));
    xhr.onabort = () => reject(new DOMException("Upload cancelado", "AbortError"));

    if (params.signal) {
      if (params.signal.aborted) {
        xhr.abort();
        return;
      }
      params.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}
