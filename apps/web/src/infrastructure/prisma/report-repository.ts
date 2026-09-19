import type { Pothole, Prisma, PrismaClient, Report, ReportStatus } from "@prisma/client";
import { OptimisticLockError } from "@/domain/errors";
import type { ReportRepository } from "@/domain/ports";

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: {
    inspectionId?: string;
    aerialImageId?: string;
    status?: ReportStatus;
  }): Promise<Report> {
    return this.db.report.create({ data });
  }

  findById(id: string): Promise<Report | null> {
    return this.db.report.findUnique({ where: { id } });
  }

  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: {
      status?: ReportStatus;
      summary?: string;
      preprocessMeta?: Prisma.InputJsonValue;
    },
  ): Promise<Report> {
    const result = await this.db.report.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new OptimisticLockError("Report", id, expectedVersion);
    }

    return this.db.report.findUniqueOrThrow({ where: { id } });
  }

  async addPotholes(
    reportId: string,
    potholes: Array<{
      confidence?: number;
      bboxX?: number;
      bboxY?: number;
      bboxW?: number;
      bboxH?: number;
      maskPath?: string;
      areaPx?: number;
    }>,
  ): Promise<Pothole[]> {
    if (potholes.length === 0) return [];

    await this.db.pothole.createMany({
      data: potholes.map((p) => ({ ...p, reportId })),
    });

    return this.db.pothole.findMany({ where: { reportId } });
  }
}
