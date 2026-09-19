import type { Inspection, PrismaClient } from "@prisma/client";
import { OptimisticLockError } from "@/domain/errors";
import type { InspectionRepository } from "@/domain/ports";

export class PrismaInspectionRepository implements InspectionRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: {
    title: string;
    location?: string;
    flightId?: string;
  }): Promise<Inspection> {
    return this.db.inspection.create({ data });
  }

  findById(id: string): Promise<Inspection | null> {
    return this.db.inspection.findUnique({ where: { id } });
  }

  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: { title?: string; location?: string; status?: string },
  ): Promise<Inspection> {
    const result = await this.db.inspection.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new OptimisticLockError("Inspection", id, expectedVersion);
    }

    const updated = await this.db.inspection.findUniqueOrThrow({ where: { id } });
    return updated;
  }
}
