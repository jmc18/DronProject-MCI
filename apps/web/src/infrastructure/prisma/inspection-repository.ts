import type { Inspection, PrismaClient, ReportStatus } from "@prisma/client";
import { OptimisticLockError } from "@/domain/errors";
import type {
  InspectionDetail,
  InspectionListItem,
  InspectionRepository,
} from "@/domain/ports";

function rollupStatus(statuses: ReportStatus[]): ReportStatus | null {
  if (statuses.length === 0) return null;
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("PROCESSING")) return "PROCESSING";
  if (statuses.includes("PENDING")) return "PENDING";
  return "COMPLETED";
}

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

  async list(): Promise<InspectionListItem[]> {
    const rows = await this.db.inspection.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { id: true } },
        reports: { include: { potholes: { select: { id: true } } } },
      },
    });

    return rows.map((row) => {
      const { images, reports, ...inspection } = row;
      return {
        ...inspection,
        imageCount: images.length,
        potholeCount: reports.reduce((sum, report) => sum + report.potholes.length, 0),
        latestReportStatus: rollupStatus(reports.map((report) => report.status)),
      };
    });
  }

  findDetail(id: string): Promise<InspectionDetail | null> {
    return this.db.inspection.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { capturedAt: "asc" },
          include: {
            reports: {
              orderBy: { createdAt: "desc" },
              include: { potholes: { orderBy: { createdAt: "asc" } } },
            },
          },
        },
      },
    });
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
