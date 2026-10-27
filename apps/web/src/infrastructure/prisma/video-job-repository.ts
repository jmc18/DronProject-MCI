import { Prisma, type PrismaClient, type VideoJob, type VideoJobStatus } from "@prisma/client";
import type { VideoJobRepository } from "@/domain/ports";

export class PrismaVideoJobRepository implements VideoJobRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: {
    id?: string;
    originalFilename: string;
    storageDir: string;
    model: string;
    contentSha256: string;
    sizeBytes?: bigint;
    status?: VideoJobStatus;
    timeoutAt?: Date;
  }): Promise<VideoJob> {
    return this.db.videoJob.create({
      data: {
        id: data.id,
        originalFilename: data.originalFilename,
        storageDir: data.storageDir,
        model: data.model,
        contentSha256: data.contentSha256,
        sizeBytes: data.sizeBytes,
        status: data.status ?? "PENDING",
        timeoutAt: data.timeoutAt,
      },
    });
  }

  findById(id: string): Promise<VideoJob | null> {
    return this.db.videoJob.findUnique({ where: { id } });
  }

  async list(params: { page: number; pageSize: number }): Promise<{
    items: VideoJob[];
    total: number;
  }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(15, Math.max(1, params.pageSize));
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.db.videoJob.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.db.videoJob.count(),
    ]);
    return { items, total };
  }

  update(
    id: string,
    data: {
      status?: VideoJobStatus;
      progress?: number;
      meta?: Prisma.InputJsonValue;
      errorMessage?: string | null;
      warning?: string | null;
      sizeBytes?: bigint;
      timeoutAt?: Date | null;
    },
  ): Promise<VideoJob> {
    const { meta, ...rest } = data;
    return this.db.videoJob.update({
      where: { id },
      data: {
        ...rest,
        ...(meta === undefined ? {} : { meta: meta === null ? Prisma.DbNull : meta }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.videoJob.delete({ where: { id } });
  }
}
