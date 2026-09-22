import { NextResponse } from "next/server";
import { z } from "zod";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { toInspectionListItemDto } from "@/domain/inspection-view";
import type { InspectionRepository } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
});

export async function GET() {
  const container = createAppContainer();
  const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
  const items = await inspections.list();
  return NextResponse.json({
    ok: true,
    inspections: items.map(toInspectionListItemDto),
  });
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const container = createAppContainer();
    const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
    const inspection = await inspections.create({
      title: body.title,
      location: body.location,
    });
    return NextResponse.json({ ok: true, inspection }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Título requerido", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
