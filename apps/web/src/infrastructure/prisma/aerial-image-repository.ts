import type { AerialImage, PrismaClient } from "@prisma/client";
import type { AerialImageRepository } from "@/domain/ports";

export class PrismaAerialImageRepository implements AerialImageRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: {
    inspectionId?: string;
    storageKey: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  }): Promise<AerialImage> {
    return this.db.aerialImage.create({ data });
  }

  findById(id: string): Promise<AerialImage | null> {
    return this.db.aerialImage.findUnique({ where: { id } });
  }
}
