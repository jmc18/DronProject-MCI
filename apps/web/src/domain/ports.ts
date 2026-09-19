import type {
  AerialImage,
  Device,
  DeviceType,
  Inspection,
  Pothole,
  Prisma,
  Report,
  ReportStatus,
  Telemetry,
} from "@prisma/client";

export type {
  AerialImage,
  Device,
  DeviceType,
  Inspection,
  Pothole,
  Report,
  ReportStatus,
  Telemetry,
};

export interface InspectionRepository {
  create(data: { title: string; location?: string; flightId?: string }): Promise<Inspection>;
  findById(id: string): Promise<Inspection | null>;
  updateWithVersion(
    id: string,
    expectedVersion: number,
    data: { title?: string; location?: string; status?: string },
  ): Promise<Inspection>;
}

export interface ReportRepository {
  create(data: {
    inspectionId?: string;
    aerialImageId?: string;
    status?: ReportStatus;
  }): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  updateWithVersion(
    id: string,
    expectedVersion: number,
    data: {
      status?: ReportStatus;
      summary?: string;
      preprocessMeta?: Prisma.InputJsonValue;
    },
  ): Promise<Report>;
  addPotholes(
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
  ): Promise<Pothole[]>;
}

export interface DeviceRepository {
  upsertByKey(data: {
    deviceKey: string;
    name: string;
    type: DeviceType;
  }): Promise<Device>;
  findByKey(deviceKey: string): Promise<Device | null>;
  addTelemetry(
    deviceId: string,
    data: {
      battery?: number;
      latitude?: number;
      longitude?: number;
      altitude?: number;
      rssi?: number;
      payload?: Prisma.InputJsonValue;
    },
  ): Promise<Telemetry>;
}

export interface StoredFile {
  storageKey: string;
  absolutePath: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageService {
  save(file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StoredFile>;
  resolvePath(storageKey: string): string;
}

export interface AnalyzerDetection {
  confidence?: number;
  bbox?: [number, number, number, number];
  area_px?: number;
  mask_path?: string;
}

export interface AnalyzerResponse {
  ok: boolean;
  warning?: string;
  image_meta?: Record<string, unknown>;
  preprocess?: Record<string, unknown>;
  detections: AnalyzerDetection[];
}

export interface AnalyzerClient {
  health(): Promise<boolean>;
  analyze(image: Buffer, filename: string): Promise<AnalyzerResponse>;
}

export interface IotIngestPayload {
  deviceKey: string;
  deviceToken: string;
  deviceType?: DeviceType;
  deviceName?: string;
  telemetry?: {
    battery?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    rssi?: number;
    payload?: Record<string, unknown>;
  };
  image?: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  };
  inspectionTitle?: string;
  triggerAnalyze?: boolean;
}

export interface IotIngestResult {
  device: Device;
  telemetry?: Telemetry;
  aerialImage?: AerialImage;
  inspection?: Inspection;
  report?: Report;
  analysis?: AnalyzerResponse;
}

export interface IotIngestService {
  ingest(payload: IotIngestPayload): Promise<IotIngestResult>;
}

export interface MqttBridge {
  /** Stub: documenta el contrato de suscripción MQTT. */
  describeTopics(): string[];
  start(): Promise<void>;
  stop(): Promise<void>;
}
