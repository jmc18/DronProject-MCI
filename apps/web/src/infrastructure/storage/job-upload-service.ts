import { createHash, randomUUID } from "crypto";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import Busboy from "busboy";
import { getJobsDir, getMaxUploadBytes } from "@/lib/env";
import { isMp4Ftyp, sanitizeFilename } from "@/lib/security/mp4";

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_VIDEO" | "NOT_MP4" | "TOO_LARGE" | "HASH_MISMATCH" | "SAVE_FAILED",
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface StreamUploadResult {
  jobId: string;
  storageDir: string;
  absoluteOriginal: string;
  originalFilename: string;
  contentSha256: string;
  sizeBytes: number;
  modelField?: string;
}

/**
 * Streaming multipart a disco con busboy.
 * Escribe original.mp4.part → rename a original.mp4 tras validar hash.
 */
export async function streamVideoUpload(
  request: Request,
  expectedContentSha256?: string,
): Promise<StreamUploadResult> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !request.body) {
    throw new UploadError("El campo video es requerido", "NO_VIDEO");
  }

  const maxBytes = getMaxUploadBytes();
  const jobId = randomUUID();
  const storageDir = path.join(getJobsDir(), jobId);
  const partPath = path.join(storageDir, "original.mp4.part");
  const finalPath = path.join(storageDir, "original.mp4");

  await fs.mkdir(storageDir, { recursive: true });

  const body = Readable.fromWeb(request.body as import("stream/web").ReadableStream);

  return new Promise<StreamUploadResult>((resolve, reject) => {
    let settled = false;
    let gotVideo = false;
    let originalFilename = "video.mp4";
    let modelField: string | undefined;
    let sizeBytes = 0;
    let hash = createHash("sha256");
    let headerBuf = Buffer.alloc(0);
    let ftypChecked = false;
    let writeStream: ReturnType<typeof createWriteStream> | null = null;

    const fail = async (err: Error) => {
      if (settled) return;
      settled = true;
      try {
        writeStream?.destroy();
      } catch {
        /* ignore */
      }
      await fs.rm(storageDir, { recursive: true, force: true }).catch(() => undefined);
      reject(err);
    };

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { files: 1, fileSize: maxBytes },
    });

    busboy.on("field", (name, value) => {
      if (name === "model") modelField = value;
    });

    busboy.on("file", (name, file, info) => {
      if (name !== "video") {
        file.resume();
        return;
      }
      gotVideo = true;
      originalFilename = sanitizeFilename(info.filename || "video.mp4");
      writeStream = createWriteStream(partPath);

      file.on("data", (chunk: Buffer) => {
        sizeBytes += chunk.length;
        if (sizeBytes > maxBytes) {
          file.destroy();
          void fail(new UploadError("El campo video es requerido", "TOO_LARGE"));
          return;
        }

        if (!ftypChecked) {
          headerBuf = Buffer.concat([headerBuf, chunk]);
          if (headerBuf.length >= 12) {
            ftypChecked = true;
            if (!isMp4Ftyp(headerBuf)) {
              file.destroy();
              void fail(new UploadError("El campo video es requerido", "NOT_MP4"));
              return;
            }
          }
        }

        hash.update(chunk);
        if (writeStream && !writeStream.write(chunk)) {
          file.pause();
          writeStream.once("drain", () => file.resume());
        }
      });

      file.on("limit", () => {
        void fail(new UploadError("El campo video es requerido", "TOO_LARGE"));
      });

      file.on("error", (err) => {
        void fail(err instanceof Error ? err : new UploadError("No se pudo guardar el video", "SAVE_FAILED"));
      });

      file.on("end", () => {
        writeStream?.end();
      });
    });

    busboy.on("error", (err) => {
      void fail(err instanceof Error ? err : new UploadError("No se pudo guardar el video", "SAVE_FAILED"));
    });

    busboy.on("finish", async () => {
      if (settled) return;
      try {
        if (!gotVideo || sizeBytes === 0) {
          await fail(new UploadError("El campo video es requerido", "NO_VIDEO"));
          return;
        }
        if (!ftypChecked || !isMp4Ftyp(headerBuf)) {
          await fail(new UploadError("El campo video es requerido", "NOT_MP4"));
          return;
        }

        // Esperar flush del write stream
        await new Promise<void>((res, rej) => {
          if (!writeStream) {
            res();
            return;
          }
          if (writeStream.closed || writeStream.writableEnded) {
            res();
            return;
          }
          writeStream.on("finish", () => res());
          writeStream.on("error", rej);
        });

        const digest = hash.digest("hex");
        if (
          expectedContentSha256 &&
          digest !== expectedContentSha256.toLowerCase()
        ) {
          await fail(new UploadError("API key inválida", "HASH_MISMATCH"));
          return;
        }

        await fs.rename(partPath, finalPath);

        settled = true;
        resolve({
          jobId,
          storageDir,
          absoluteOriginal: finalPath,
          originalFilename,
          contentSha256: digest,
          sizeBytes,
          modelField,
        });
      } catch (err) {
        await fail(
          err instanceof UploadError
            ? err
            : new UploadError("No se pudo guardar el video", "SAVE_FAILED"),
        );
      }
    });

    pipeline(body, busboy).catch((err) => {
      void fail(
        err instanceof UploadError
          ? err
          : new UploadError("No se pudo guardar el video", "SAVE_FAILED"),
      );
    });
  });
}

/** Interfaz preparada para v2 chunks (no implementada). */
export interface ResumableUploadSession {
  createSession(params: {
    idempotencyKey: string;
    contentSha256: string;
    totalBytes: number;
    filename: string;
  }): Promise<{ sessionId: string; uploadOffset: number }>;
  appendChunk(sessionId: string, offset: number, chunk: Readable): Promise<{ nextOffset: number }>;
  complete(sessionId: string): Promise<StreamUploadResult>;
}
