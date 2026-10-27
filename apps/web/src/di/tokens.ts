/**
 * Tokens de Inyección de Dependencias.
 * Usamos Symbol.for para claves estables en todo el proceso Node.
 */
export const TOKENS = {
  InspectionRepository: Symbol.for("InspectionRepository"),
  AerialImageRepository: Symbol.for("AerialImageRepository"),
  ReportRepository: Symbol.for("ReportRepository"),
  DeviceRepository: Symbol.for("DeviceRepository"),
  StorageService: Symbol.for("StorageService"),
  AnalyzerClient: Symbol.for("AnalyzerClient"),
  AnalyzeImageService: Symbol.for("AnalyzeImageService"),
  PdfReportService: Symbol.for("PdfReportService"),
  IotIngestService: Symbol.for("IotIngestService"),
  VideoJobRepository: Symbol.for("VideoJobRepository"),
  IdempotencyRepository: Symbol.for("IdempotencyRepository"),
  JobNotifier: Symbol.for("JobNotifier"),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
