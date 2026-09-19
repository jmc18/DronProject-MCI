import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { StorageService, StoredFile } from "@/domain/ports";

export class LocalStorageService implements StorageService {
  constructor(private readonly uploadDir: string) {}

  async save(file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StoredFile> {
    await mkdir(this.uploadDir, { recursive: true });

    const ext = path.extname(file.originalName) || ".jpg";
    const storageKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
    const absolutePath = path.join(this.uploadDir, storageKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      storageKey,
      absolutePath,
      sizeBytes: file.buffer.byteLength,
      mimeType: file.mimeType,
    };
  }

  resolvePath(storageKey: string): string {
    return path.join(this.uploadDir, storageKey);
  }
}
