import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { OptimisticLockError } from "@/domain/errors";
import type {
  AnalyzerClient,
  InspectionRepository,
  ReportRepository,
  StorageService,
} from "@/domain/ports";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Análisis manual desde la UI/API: guarda imagen, crea Inspection/Report y llama al analyzer.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "Análisis manual");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const container = createAppContainer();
    const storage = container.resolve<StorageService>(TOKENS.StorageService);
    const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
    const reports = container.resolve<ReportRepository>(TOKENS.ReportRepository);
    const analyzer = container.resolve<AnalyzerClient>(TOKENS.AnalyzerClient);

    const stored = await storage.save({
      buffer,
      originalName: file.name || "upload.jpg",
      mimeType: file.type || "image/jpeg",
    });

    const inspection = await inspections.create({ title });
    const aerialImage = await prisma.aerialImage.create({
      data: {
        inspectionId: inspection.id,
        storageKey: stored.storageKey,
        originalName: file.name,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });

    let report = await reports.create({
      inspectionId: inspection.id,
      aerialImageId: aerialImage.id,
      status: "PROCESSING",
    });

    const analysis = await analyzer.analyze(buffer, file.name || "upload.jpg");

    report = await reports.updateWithVersion(report.id, report.version, {
      status: "COMPLETED",
      summary: `Detecciones: ${analysis.detections?.length ?? 0}`,
      preprocessMeta: {
        image_meta: analysis.image_meta ?? null,
        preprocess: analysis.preprocess ?? null,
        warning: analysis.warning ?? null,
      } as Prisma.InputJsonValue,
    });

    const potholes = await reports.addPotholes(
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

    return NextResponse.json({
      ok: true,
      inspection,
      aerialImage,
      report,
      potholes,
      analysis,
    });
  } catch (err) {
    if (err instanceof OptimisticLockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
