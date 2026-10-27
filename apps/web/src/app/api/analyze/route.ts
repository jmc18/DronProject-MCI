import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { NotFoundError, OptimisticLockError } from "@/domain/errors";
import type { AnalyzeImageService, InspectionRepository } from "@/domain/ports";
import { requireApiKeyHeader } from "@/lib/security/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * @deprecated Preferir POST /api/videos/upload (pipeline MP4 8K).
 * Análisis manual por imagen — se retirará en una fase posterior.
 * Requiere header x-api-key.
 */
export async function POST(request: Request) {
  const auth = requireApiKeyHeader(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "Análisis manual");
    const location = String(form.get("location") ?? "") || undefined;
    const inspectionIdRaw = String(form.get("inspectionId") ?? "") || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const container = createAppContainer();
    const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
    const analyze = container.resolve<AnalyzeImageService>(TOKENS.AnalyzeImageService);

    const inspection = inspectionIdRaw
      ? await inspections.findById(inspectionIdRaw)
      : await inspections.create({ title, location });

    if (!inspection) {
      throw new NotFoundError("Inspection", inspectionIdRaw ?? "");
    }

    const result = await analyze.analyzeFile({
      inspectionId: inspection.id,
      file: {
        buffer,
        originalName: file.name || "upload.jpg",
        mimeType: file.type || "image/jpeg",
      },
    });

    const failed = result.report.status === "FAILED";
    return NextResponse.json(
      {
        ok: !failed,
        inspection,
        aerialImage: result.aerialImage,
        report: result.report,
        potholes: result.potholes,
        analysis: result.analysis,
        error: failed ? result.report.summary : undefined,
      },
      { status: failed ? 502 : 200 },
    );
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
