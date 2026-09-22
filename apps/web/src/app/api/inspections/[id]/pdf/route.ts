import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { NotFoundError } from "@/domain/errors";
import type { InspectionRepository, PdfReportService } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const container = createAppContainer();
    const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
    const pdf = container.resolve<PdfReportService>(TOKENS.PdfReportService);

    const detail = await inspections.findDetail(id);
    if (!detail) {
      throw new NotFoundError("Inspection", id);
    }

    const bytes = await pdf.render(detail);
    const slug = detail.title.replace(/[^\w\-]+/g, "_").slice(0, 40) || "recorrido";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
