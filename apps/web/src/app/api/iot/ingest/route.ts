import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { OptimisticLockError, UnauthorizedDeviceError } from "@/domain/errors";
import type { IotIngestService } from "@/domain/ports";
import type { DeviceType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingestión IoT desde Raspberry Pi / agentes edge.
 * Multipart: deviceKey, deviceToken, opcionales de telemetría + file (imagen).
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const deviceKey = String(form.get("deviceKey") ?? "");
    const deviceToken = String(
      form.get("deviceToken") ?? request.headers.get("x-device-token") ?? "",
    );

    if (!deviceKey) {
      return NextResponse.json({ error: "deviceKey requerido" }, { status: 400 });
    }

    const file = form.get("file");
    let image: { buffer: Buffer; originalName: string; mimeType: string } | undefined;
    if (file instanceof File && file.size > 0) {
      image = {
        buffer: Buffer.from(await file.arrayBuffer()),
        originalName: file.name || "edge.jpg",
        mimeType: file.type || "image/jpeg",
      };
    }

    const rawType = String(form.get("deviceType") ?? "RASPBERRY_PI");
    const deviceType = (rawType === "ESP32" ? "ESP32" : "RASPBERRY_PI") as DeviceType;

    const telemetry = {
      battery: numOrUndef(form.get("battery")),
      latitude: numOrUndef(form.get("latitude")),
      longitude: numOrUndef(form.get("longitude")),
      altitude: numOrUndef(form.get("altitude")),
      rssi: numOrUndef(form.get("rssi")),
    };

    const hasTelemetry = Object.values(telemetry).some((v) => v !== undefined);

    const container = createAppContainer();
    const iot = container.resolve<IotIngestService>(TOKENS.IotIngestService);

    const result = await iot.ingest({
      deviceKey,
      deviceToken,
      deviceType,
      deviceName: String(form.get("deviceName") ?? deviceKey),
      telemetry: hasTelemetry ? telemetry : undefined,
      image,
      inspectionTitle: String(form.get("inspectionTitle") ?? "") || undefined,
      triggerAnalyze: String(form.get("triggerAnalyze") ?? "true") !== "false",
    });

    return NextResponse.json({
      ok: true,
      deviceId: result.device.id,
      telemetryId: result.telemetry?.id,
      inspectionId: result.inspection?.id,
      aerialImageId: result.aerialImage?.id,
      reportId: result.report?.id,
      reportStatus: result.report?.status,
      detections: result.analysis?.detections?.length ?? 0,
      warning: result.analysis?.warning,
    });
  } catch (err) {
    if (err instanceof UnauthorizedDeviceError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof OptimisticLockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function numOrUndef(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
