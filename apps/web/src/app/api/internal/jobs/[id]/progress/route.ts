import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { VideoJobRepository } from "@/domain/ports";
import { getInternalToken } from "@/lib/env";
import type { Prisma, VideoJobStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyInternalToken(request: Request): boolean {
  const expected = getInternalToken();
  const provided = request.headers.get("x-internal-token") ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Callback de progreso del worker (solo INTERNAL_TOKEN).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifyInternalToken(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: {
    progress?: number;
    status?: VideoJobStatus;
    meta?: Record<string, unknown>;
    errorMessage?: string | null;
    warning?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON inválido" }, { status: 400 });
  }

  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const existing = await jobs.findById(id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Job no encontrado" }, { status: 404 });
  }

  const updated = await jobs.update(id, {
    progress: typeof body.progress === "number" ? body.progress : undefined,
    status: body.status,
    meta: body.meta as Prisma.InputJsonValue | undefined,
    errorMessage: body.errorMessage,
    warning: body.warning,
  });

  return NextResponse.json({
    success: true,
    job: {
      ...updated,
      sizeBytes: updated.sizeBytes != null ? updated.sizeBytes.toString() : null,
    },
  });
}
