import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { VideoJobRepository } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(15, Math.max(1, Number(url.searchParams.get("pageSize") ?? "15") || 15));

  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const { items, total } = await jobs.list({ page, pageSize });

  return NextResponse.json({
    success: true,
    page,
    pageSize,
    total,
    items: items.map((job) => ({
      ...job,
      sizeBytes: job.sizeBytes != null ? job.sizeBytes.toString() : null,
    })),
  });
}
