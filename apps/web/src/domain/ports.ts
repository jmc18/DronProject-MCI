import type {
  AerialImage,
  Device,
  DeviceType,
  IdempotencyKey,
  Inspection,
  Pothole,
  Prisma,
  Report,
  ReportStatus,
  Telemetry,
  VideoJob,
  VideoJobStatus,
} from "@prisma/client";

export type {
  AerialImage,
  Device,
  DeviceType,
  IdempotencyKey,
  Inspection,
  Pothole,
  Report,
  ReportStatus,
  Telemetry,
  VideoJob,
  VideoJobStatus,
};

export type ReportWithPotholes = Report & { potholes: Pothole[] };

export type AerialImageWithReports = AerialImage & {
  reports: ReportWithPotholes[];
};

export type InspectionDetail = Inspection & {
  images: AerialImageWithReports[];
};

export type InspectionListItem = Inspection & {
  imageCount: number;
  potholeCount: number;
  latestReportStatus: ReportStatus | null;
};

export interface InspectionRepository {
  create(data: { title: string; location?: string; flightId?: string }): Promise<Inspection>;
  findById(id: string): Promise<Inspection | null>;
  list(): Promise<InspectionListItem[]>;
  findDetail(id: string): Promise<InspectionDetail | null>;
  updateWithVersion(
    id: string,
    expectedVersion: number,
    data: { title?: string; location?: string; status?: string },
  ): Promise<Inspection>;
}

export interface AerialImageRepository {
  create(data: {
    inspectionId?: string;
    storageKey: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  }): Promise<AerialImage>;
  findById(id: string): Promise<AerialImage | null>;
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
  read(storageKey: string): Promise<Buffer>;
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

export interface AnalyzedImageResult {
  aerialImage: AerialImage;
  report: Report;
  potholes: Pothole[];
  analysis?: AnalyzerResponse;
}

export interface AnalyzeImageService {
  analyzeFile(params: {
    inspectionId: string;
    file: { buffer: Buffer; originalName: string; mimeType: string };
  }): Promise<AnalyzedImageResult>;
}

export interface PdfReportService {
  render(detail: InspectionDetail): Promise<Buffer>;
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

export interface VideoJobRepository {
  create(data: {
    id?: string;
    originalFilename: string;
    storageDir: string;
    model: string;
    contentSha256: string;
    sizeBytes?: bigint;
    status?: VideoJobStatus;
    timeoutAt?: Date;
  }): Promise<VideoJob>;
  findById(id: string): Promise<VideoJob | null>;
  list(params: { page: number; pageSize: number }): Promise<{ items: VideoJob[]; total: number }>;
  update(
    id: string,
    data: {
      status?: VideoJobStatus;
      progress?: number;
      meta?: Prisma.InputJsonValue | null;
      errorMessage?: string | null;
      warning?: string | null;
      sizeBytes?: bigint;
      timeoutAt?: Date | null;
    },
  ): Promise<VideoJob>;
  delete(id: string): Promise<void>;
}

export interface IdempotencyRepository {
  findByKey(key: string): Promise<IdempotencyKey | null>;
  create(data: {
    key: string;
    contentSha256: string;
    responseStatus: number;
    responseBody: Prisma.InputJsonValue;
    jobId?: string;
  }): Promise<IdempotencyKey>;
  deleteExpired(): Promise<number>;
  deleteByKey(key: string): Promise<void>;
  deleteByJobId(jobId: string): Promise<number>;
}

export interface JobNotifier {
  enqueue(params: { jobId: string; path: string; model: string }): Promise<void>;
}

/**
 * Roadmap v2 — subida por chunks reanudable (NO implementado).
 * Contrato previsto: create → append (Upload-Offset) → complete.
 */
export interface ResumableUploadSession {
  createSession(params: {
    idempotencyKey: string;
    contentSha256: string;
    totalBytes: number;
    filename: string;
  }): Promise<{ sessionId: string; uploadOffset: number }>;
  appendChunk(
    sessionId: string,
    offset: number,
    chunk: NodeJS.ReadableStream,
  ): Promise<{ nextOffset: number }>;
  complete(sessionId: string): Promise<{ jobId: string; absoluteOriginal: string }>;
}
