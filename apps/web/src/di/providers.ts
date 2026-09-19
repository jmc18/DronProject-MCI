import path from "path";
import { Container } from "@/di/container";
import { TOKENS } from "@/di/tokens";
import type {
  AnalyzerClient,
  DeviceRepository,
  InspectionRepository,
  IotIngestService,
  MqttBridge,
  ReportRepository,
  StorageService,
} from "@/domain/ports";
import { HttpAnalyzerClient } from "@/infrastructure/analyzer/http-analyzer-client";
import { DefaultIotIngestService } from "@/infrastructure/iot/iot-ingest-service";
import { StubMqttBridge } from "@/infrastructure/iot/mqtt-bridge";
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

  const inspections = new PrismaInspectionRepository(prisma);
  const reports = new PrismaReportRepository(prisma);
  const devices = new PrismaDeviceRepository(prisma);
  const storage = new LocalStorageService(uploadDir);
  const analyzer = new HttpAnalyzerClient(analyzerUrl);
  const mqtt = new StubMqttBridge(mqttUrl);

  const iot = new DefaultIotIngestService(
    prisma,
    devices,
    inspections,
    reports,
    storage,
    analyzer,
    deviceToken,
  );

  container.register<InspectionRepository>(TOKENS.InspectionRepository, inspections);
  container.register<ReportRepository>(TOKENS.ReportRepository, reports);
  container.register<DeviceRepository>(TOKENS.DeviceRepository, devices);
  container.register<StorageService>(TOKENS.StorageService, storage);
  container.register<AnalyzerClient>(TOKENS.AnalyzerClient, analyzer);
  container.register<IotIngestService>(TOKENS.IotIngestService, iot);
  container.register<MqttBridge>(TOKENS.MqttBridge, mqtt);

  void mqtt.start();

  cached = container;
  return container;
}
