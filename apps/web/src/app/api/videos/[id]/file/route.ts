import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import type { VideoJobRepository } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["original", "preview", "processed"]);

function contentDisposition(name: string, download: boolean): string {
  const filename = `${name}.mp4`;
  return download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;
}

/**
 * GET /api/videos/:id/file?name=preview|processed|original
 * Soporta Range con createReadStream(start, end).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "preview";
  const download = url.searchParams.get("download") === "1";

  if (!ALLOWED.has(name)) {
    return NextResponse.json({ success: false, message: "Archivo no válido" }, { status: 400 });
  }

  // original solo descarga
  if (name === "original" && !download) {
    // permitir inline técnico pero UI pedirá download; OK
  }

  const container = createAppContainer();
  const jobs = container.resolve<VideoJobRepository>(TOKENS.VideoJobRepository);
  const job = await jobs.findById(id);
  if (!job) {
    return NextResponse.json({ success: false, message: "Job no encontrado" }, { status: 404 });
  }

  const filePath = path.join(job.storageDir, `${name}.mp4`);
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return NextResponse.json({ success: false, message: "Archivo no disponible" }, { status: 404 });
  }

  const fileSize = stat.size;
  const range = request.headers.get("range");
  const headers: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": "video/mp4",
    "Content-Disposition": contentDisposition(name, download || name === "original"),
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : fileSize - 1;
    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    headers["Content-Length"] = String(chunkSize);
    return new NextResponse(Readable.toWeb(nodeStream) as unknown as BodyInit, {
      status: 206,
      headers,
    });
  }

  headers["Content-Length"] = String(fileSize);
  const nodeStream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(nodeStream) as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
