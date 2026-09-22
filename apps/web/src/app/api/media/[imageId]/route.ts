import { NextResponse } from "next/server";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { InvalidStorageKeyError, NotFoundError } from "@/domain/errors";
import type { AerialImageRepository, StorageService } from "@/domain/ports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> },
) {
  try {
    const { imageId } = await context.params;
    const container = createAppContainer();
    const images = container.resolve<AerialImageRepository>(TOKENS.AerialImageRepository);
    const storage = container.resolve<StorageService>(TOKENS.StorageService);

    const image = await images.findById(imageId);
    if (!image) {
      throw new NotFoundError("AerialImage", imageId);
    }

    const buffer = await storage.read(image.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidStorageKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
