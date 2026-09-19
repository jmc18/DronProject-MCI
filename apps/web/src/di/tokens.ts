/**
 * Tokens de Inyección de Dependencias.
 * Usamos Symbol.for para claves estables en todo el proceso Node.
 */
export const TOKENS = {
  InspectionRepository: Symbol.for("InspectionRepository"),
  ReportRepository: Symbol.for("ReportRepository"),
  DeviceRepository: Symbol.for("DeviceRepository"),
  StorageService: Symbol.for("StorageService"),
  AnalyzerClient: Symbol.for("AnalyzerClient"),
  IotIngestService: Symbol.for("IotIngestService"),
  MqttBridge: Symbol.for("MqttBridge"),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];
