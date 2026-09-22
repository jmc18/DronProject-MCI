import type { ReportStatus } from "@prisma/client";
import { bboxScaleFromMeta, imageSizeFromMeta, warningFromMeta } from "@/domain/bbox";
import type { AerialImageWithReports, InspectionDetail, InspectionListItem } from "@/domain/ports";

export type ReviewPothole = {
  id: string;
  confidence: number | null;
  bboxX: number | null;
  bboxY: number | null;
  bboxW: number | null;
  bboxH: number | null;
  areaPx: number | null;
};

export type ReviewReport = {
  id: string;
  status: ReportStatus;
  summary: string | null;
  warning: string | null;
  sampleFactor: number;
  imageWidth: number | null;
  imageHeight: number | null;
  potholes: ReviewPothole[];
};

export type ReviewImage = {
  id: string;
  originalName: string | null;
  mediaUrl: string;
  capturedAt: string;
  report: ReviewReport | null;
};

export type InspectionReviewDto = {
  id: string;
  title: string;
  location: string | null;
  status: string;
  createdAt: string;
  potholeCount: number;
  images: ReviewImage[];
};

export function toInspectionReviewDto(detail: InspectionDetail): InspectionReviewDto {
  const images: ReviewImage[] = detail.images.map((image: AerialImageWithReports) => {
    const report = image.reports[0] ?? null;
    return {
      id: image.id,
      originalName: image.originalName,
      mediaUrl: `/api/media/${image.id}`,
      capturedAt: image.capturedAt.toISOString(),
      report: report
        ? {
            id: report.id,
            status: report.status,
            summary: report.summary,
            warning: warningFromMeta(report.preprocessMeta),
            sampleFactor: bboxScaleFromMeta(report.preprocessMeta),
            imageWidth: imageSizeFromMeta(report.preprocessMeta).width,
            imageHeight: imageSizeFromMeta(report.preprocessMeta).height,
            potholes: report.potholes.map((p) => ({
              id: p.id,
              confidence: p.confidence,
              bboxX: p.bboxX,
              bboxY: p.bboxY,
              bboxW: p.bboxW,
              bboxH: p.bboxH,
              areaPx: p.areaPx,
            })),
          }
        : null,
    };
  });

  return {
    id: detail.id,
    title: detail.title,
    location: detail.location,
    status: detail.status,
    createdAt: detail.createdAt.toISOString(),
    potholeCount: images.reduce((sum, image) => sum + (image.report?.potholes.length ?? 0), 0),
    images,
  };
}

export type InspectionListItemDto = {
  id: string;
  title: string;
  location: string | null;
  status: string;
  createdAt: string;
  imageCount: number;
  potholeCount: number;
  latestReportStatus: ReportStatus | null;
};

export function toInspectionListItemDto(item: InspectionListItem): InspectionListItemDto {
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    imageCount: item.imageCount,
    potholeCount: item.potholeCount,
    latestReportStatus: item.latestReportStatus,
  };
}
