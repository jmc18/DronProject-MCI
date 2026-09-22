import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/domain/errors";
import type {
  AerialImageRepository,
  AnalyzeImageService,
  AnalyzedImageResult,
  AnalyzerClient,
  InspectionRepository,
  ReportRepository,
  StorageService,
} from "@/domain/ports";

/**
 * Guarda una foto aérea, dispara el analyzer y persiste baches.
 * Si el analyzer falla, el informe queda en FAILED.
 */
export class DefaultAnalyzeImageService implements AnalyzeImageService {
  constructor(
    private readonly inspections: InspectionRepository,
    private readonly images: AerialImageRepository,
    private readonly reports: ReportRepository,
    private readonly storage: StorageService,
    private readonly analyzer: AnalyzerClient,
  ) {}

  async analyzeFile(params: {
    inspectionId: string;
    file: { buffer: Buffer; originalName: string; mimeType: string };
  }): Promise<AnalyzedImageResult> {
    const inspection = await this.inspections.findById(params.inspectionId);
    if (!inspection) {
      throw new NotFoundError("Inspection", params.inspectionId);
    }

    const stored = await this.storage.save(params.file);
    const aerialImage = await this.images.create({
      inspectionId: inspection.id,
      storageKey: stored.storageKey,
      originalName: params.file.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    });

    let report = await this.reports.create({
      inspectionId: inspection.id,
      aerialImageId: aerialImage.id,
      status: "PROCESSING",
    });

    try {
      const analysis = await this.analyzer.analyze(
        params.file.buffer,
        params.file.originalName,
      );

      report = await this.reports.updateWithVersion(report.id, report.version, {
        status: "COMPLETED",
        summary: `Detecciones: ${analysis.detections?.length ?? 0}`,
        preprocessMeta: {
          image_meta: analysis.image_meta ?? null,
          preprocess: analysis.preprocess ?? null,
          warning: analysis.warning ?? null,
        } as Prisma.InputJsonValue,
      });

      const potholes = await this.reports.addPotholes(
        report.id,
        (analysis.detections ?? []).map((d) => ({
          confidence: d.confidence,
          bboxX: d.bbox?.[0],
          bboxY: d.bbox?.[1],
          bboxW: d.bbox?.[2],
          bboxH: d.bbox?.[3],
          areaPx: d.area_px,
          maskPath: d.mask_path,
        })),
      );

      return { aerialImage, report, potholes, analysis };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de análisis";
      report = await this.reports.updateWithVersion(report.id, report.version, {
        status: "FAILED",
        summary: message,
      });
      return { aerialImage, report, potholes: [] };
    }
  }
}
