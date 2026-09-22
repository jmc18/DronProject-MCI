import type { Pothole } from "@prisma/client";

type PreprocessMeta = {
  image_meta?: { width?: number; height?: number; [key: string]: unknown };
  preprocess?: { sample_factor?: number; [key: string]: unknown };
  warning?: string | null;
};

export function asPreprocessMeta(value: unknown): PreprocessMeta | null {
  if (!value || typeof value !== "object") return null;
  return value as PreprocessMeta;
}

/** YOLO infiere sobre la imagen decimada; el overlay usa la foto original. */
export function bboxScaleFromMeta(preprocessMeta: unknown): number {
  const factor = asPreprocessMeta(preprocessMeta)?.preprocess?.sample_factor;
  return typeof factor === "number" && factor > 0 ? factor : 1;
}

export function imageSizeFromMeta(
  preprocessMeta: unknown,
): { width: number | null; height: number | null } {
  const meta = asPreprocessMeta(preprocessMeta)?.image_meta;
  const width = typeof meta?.width === "number" ? meta.width : null;
  const height = typeof meta?.height === "number" ? meta.height : null;
  return { width, height };
}

export function warningFromMeta(preprocessMeta: unknown): string | null {
  const warning = asPreprocessMeta(preprocessMeta)?.warning;
  return typeof warning === "string" && warning.length > 0 ? warning : null;
}

export function scaledBbox(
  pothole: Pick<Pothole, "bboxX" | "bboxY" | "bboxW" | "bboxH">,
  scale: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: (pothole.bboxX ?? 0) * scale,
    y: (pothole.bboxY ?? 0) * scale,
    w: (pothole.bboxW ?? 0) * scale,
    h: (pothole.bboxH ?? 0) * scale,
  };
}
