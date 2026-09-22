import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { NotFoundError, OptimisticLockError } from "@/domain/errors";
import type { AnalyzeImageService, InspectionRepository } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function collectFiles(form: FormData): File[] {
  const named = form.getAll("files").concat(form.getAll("file"));
  return named.filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const files = collectFiles(form);

    if (files.length === 0) {
      return NextResponse.json({ error: "Adjunta al menos una fotografía" }, { status: 400 });
    }

    const container = createAppContainer();
    const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
    const analyze = container.resolve<AnalyzeImageService>(TOKENS.AnalyzeImageService);

    const inspection = await inspections.findById(id);
    if (!inspection) {
      throw new NotFoundError("Inspection", id);
    }

    const results = [];
    for (const file of files) {
      const result = await analyze.analyzeFile({
        inspectionId: inspection.id,
        file: {
          buffer: Buffer.from(await file.arrayBuffer()),
          originalName: file.name || "upload.jpg",
          mimeType: file.type || "image/jpeg",
        },
      });
      results.push({
        aerialImage: result.aerialImage,
        report: result.report,
        potholes: result.potholes,
        detections: result.potholes.length,
        warning: result.analysis?.warning ?? null,
      });
    }

    return NextResponse.json({ ok: true, inspectionId: inspection.id, results });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof OptimisticLockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
