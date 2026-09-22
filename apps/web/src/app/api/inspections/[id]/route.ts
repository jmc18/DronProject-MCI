import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { toInspectionReviewDto } from "@/domain/inspection-view";
import type { InspectionRepository } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const container = createAppContainer();
  const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
  const inspection = await inspections.findDetail(id);

  if (!inspection) {
    return NextResponse.json({ error: "Recorrido no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, inspection: toInspectionReviewDto(inspection) });
}
