import type { IdempotencyKey, Prisma, PrismaClient } from "@prisma/client";
import type { IdempotencyRepository } from "@/domain/ports";

const TTL_MS = 24 * 60 * 60 * 1000;

export class PrismaIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly db: PrismaClient) {}

  findByKey(key: string): Promise<IdempotencyKey | null> {
    return this.db.idempotencyKey.findUnique({ where: { key } });
  }

  async create(data: {
    key: string;
    contentSha256: string;
    responseStatus: number;
    responseBody: Prisma.InputJsonValue;
    jobId?: string;
  }): Promise<IdempotencyKey> {
    return this.db.idempotencyKey.create({
      data: {
        key: data.key,
        contentSha256: data.contentSha256,
        responseStatus: data.responseStatus,
        responseBody: data.responseBody,
        jobId: data.jobId,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  async deleteByKey(key: string): Promise<void> {
    await this.db.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
  }

  async deleteByJobId(jobId: string): Promise<number> {
    const result = await this.db.idempotencyKey.deleteMany({ where: { jobId } });
    return result.count;
  }
}
