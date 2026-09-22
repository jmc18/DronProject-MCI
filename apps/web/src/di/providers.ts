import path from "path";
import { Container } from "@/di/container";
import { TOKENS } from "@/di/tokens";
import type {
  AerialImageRepository,
  AnalyzeImageService,
  AnalyzerClient,
  DeviceRepository,
  InspectionRepository,
  IotIngestService,
  MqttBridge,
  PdfReportService,
  ReportRepository,
  StorageService,
} from "@/domain/ports";
import { DefaultAnalyzeImageService } from "@/infrastructure/analyzer/analyze-image-service";
import { HttpAnalyzerClient } from "@/infrastructure/analyzer/http-analyzer-client";
import { DefaultIotIngestService } from "@/infrastructure/iot/iot-ingest-service";
import { StubMqttBridge } from "@/infrastructure/iot/mqtt-bridge";
import { PdfLibReportService } from "@/infrastructure/pdf/pdf-lib-report-service";
import { PrismaAerialImageRepository } from "@/infrastructure/prisma/aerial-image-repository";
import { PrismaDeviceRepository } from "@/infrastructure/prisma/device-repository";
import { PrismaInspectionRepository } from "@/infrastructure/prisma/inspection-repository";
import { PrismaReportRepository } from "@/infrastructure/prisma/report-repository";
import { LocalStorageService } from "@/infrastructure/storage/local-storage-service";
import { prisma } from "@/lib/prisma";

let cached: Container | null = null;

/**
 * Compone el grafo de dependencias de la aplicación (server-side).
 */
export function createAppContainer(): Container {
  if (cached) return cached;

  const container = new Container();

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  const analyzerUrl = process.env.ANALYZER_URL || "http://localhost:8000";
  const mqttUrl = process.env.MQTT_URL || "mqtt://localhost:1883";
  const deviceToken = process.env.IOT_DEVICE_TOKEN || "change_me_device_token";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Monitoreo Vial con Drones";

  const inspections = new PrismaInspectionRepository(prisma);
  const aerialImages = new PrismaAerialImageRepository(prisma);
  const reports = new PrismaReportRepository(prisma);
  const devices = new PrismaDeviceRepository(prisma);
  const storage = new LocalStorageService(uploadDir);
  const analyzer = new HttpAnalyzerClient(analyzerUrl);
  const mqtt = new StubMqttBridge(mqttUrl);
  const analyzeImages = new DefaultAnalyzeImageService(
    inspections,
    aerialImages,
    reports,
    storage,
    analyzer,
  );
  const pdf = new PdfLibReportService(storage, appName);

  const iot = new DefaultIotIngestService(
    devices,
    inspections,
    aerialImages,
    reports,
    storage,
    analyzer,
    deviceToken,
  );

  container.register<InspectionRepository>(TOKENS.InspectionRepository, inspections);
  container.register<AerialImageRepository>(TOKENS.AerialImageRepository, aerialImages);
  container.register<ReportRepository>(TOKENS.ReportRepository, reports);
  container.register<DeviceRepository>(TOKENS.DeviceRepository, devices);
  container.register<StorageService>(TOKENS.StorageService, storage);
  container.register<AnalyzerClient>(TOKENS.AnalyzerClient, analyzer);
  container.register<AnalyzeImageService>(TOKENS.AnalyzeImageService, analyzeImages);
  container.register<PdfReportService>(TOKENS.PdfReportService, pdf);
  container.register<IotIngestService>(TOKENS.IotIngestService, iot);
  container.register<MqttBridge>(TOKENS.MqttBridge, mqtt);

  void mqtt.start();

  cached = container;
  return container;
}
