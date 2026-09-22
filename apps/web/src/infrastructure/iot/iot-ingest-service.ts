import type { Prisma } from "@prisma/client";
import { UnauthorizedDeviceError } from "@/domain/errors";
import type {
  AerialImageRepository,
  AnalyzerClient,
  DeviceRepository,
  InspectionRepository,
  IotIngestPayload,
  IotIngestResult,
  IotIngestService,
  ReportRepository,
  StorageService,
} from "@/domain/ports";

/**
 * Orquesta ingestión IoT: autentica dispositivo, persiste telemetría/imagen
 * y opcionalmente dispara el analyzer FastAPI.
 */
export class DefaultIotIngestService implements IotIngestService {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly inspections: InspectionRepository,
    private readonly images: AerialImageRepository,
    private readonly reports: ReportRepository,
    private readonly storage: StorageService,
    private readonly analyzer: AnalyzerClient,
    private readonly expectedToken: string,
  ) {}

  async ingest(payload: IotIngestPayload): Promise<IotIngestResult> {
    if (!payload.deviceToken || payload.deviceToken !== this.expectedToken) {
      throw new UnauthorizedDeviceError();
    }

    const device = await this.devices.upsertByKey({
      deviceKey: payload.deviceKey,
      name: payload.deviceName ?? payload.deviceKey,
      type: payload.deviceType ?? "RASPBERRY_PI",
    });

    const result: IotIngestResult = { device };

    if (payload.telemetry) {
      result.telemetry = await this.devices.addTelemetry(device.id, {
        battery: payload.telemetry.battery,
        latitude: payload.telemetry.latitude,
        longitude: payload.telemetry.longitude,
        altitude: payload.telemetry.altitude,
        rssi: payload.telemetry.rssi,
        payload: payload.telemetry.payload as Prisma.InputJsonValue | undefined,
      });
    }

    if (payload.image) {
      const stored = await this.storage.save(payload.image);
      const inspection = await this.inspections.create({
        title: payload.inspectionTitle ?? `Ingest ${new Date().toISOString()}`,
      });
      result.inspection = inspection;

      const aerialImage = await this.images.create({
        inspectionId: inspection.id,
        storageKey: stored.storageKey,
        originalName: payload.image.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      });
      result.aerialImage = aerialImage;

      let report = await this.reports.create({
        inspectionId: inspection.id,
        aerialImageId: aerialImage.id,
        status: payload.triggerAnalyze === false ? "PENDING" : "PROCESSING",
      });

      if (payload.triggerAnalyze !== false) {
        try {
          const analysis = await this.analyzer.analyze(
            payload.image.buffer,
            payload.image.originalName,
          );
          result.analysis = analysis;

          report = await this.reports.updateWithVersion(report.id, report.version, {
            status: "COMPLETED",
            summary: `Detecciones: ${analysis.detections?.length ?? 0}`,
            preprocessMeta: {
              image_meta: analysis.image_meta ?? null,
              preprocess: analysis.preprocess ?? null,
              warning: analysis.warning ?? null,
            } as Prisma.InputJsonValue,
          });

          await this.reports.addPotholes(
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
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error de análisis";
          report = await this.reports.updateWithVersion(report.id, report.version, {
            status: "FAILED",
            summary: message,
          });
        }
      }

      result.report = report;
    }

    return result;
  }
}
