import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { bboxScaleFromMeta, scaledBbox, warningFromMeta } from "@/domain/bbox";
import type {
  AerialImageWithReports,
  InspectionDetail,
  PdfReportService,
  StorageService,
} from "@/domain/ports";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TEAL = rgb(0.12, 0.54, 0.48);
const AMBER = rgb(0.91, 0.64, 0.09);
const INK = rgb(0.12, 0.16, 0.2);
const MUTED = rgb(0.4, 0.45, 0.5);
const RED = rgb(0.75, 0.22, 0.18);

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

function latestReport(image: AerialImageWithReports) {
  return image.reports[0] ?? null;
}

export class PdfLibReportService implements PdfReportService {
  constructor(
    private readonly storage: StorageService,
    private readonly appName: string,
  ) {}

  async render(detail: InspectionDetail): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const potholeCount = detail.images.reduce((sum: number, image: AerialImageWithReports) => {
      return sum + (latestReport(image)?.potholes.length ?? 0);
    }, 0);
    const failedCount = detail.images.filter((image) => latestReport(image)?.status === "FAILED")
      .length;
    const warnings = [
      ...new Set(
        detail.images
          .map((image) => warningFromMeta(latestReport(image)?.preprocessMeta))
          .filter((w): w is string => Boolean(w)),
      ),
    ];

    this.drawCover(doc, { regular, bold }, detail, {
      photoCount: detail.images.length,
      potholeCount,
      failedCount,
      warnings,
    });

    for (const [index, image] of detail.images.entries()) {
      await this.drawImagePage(doc, { regular, bold }, detail, image, index + 1);
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private drawCover(
    doc: PDFDocument,
    fonts: { regular: PDFFont; bold: PDFFont },
    detail: InspectionDetail,
    stats: { photoCount: number; potholeCount: number; failedCount: number; warnings: string[] },
  ) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText("DronProject-MCI", {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.regular,
      color: TEAL,
    });
    y -= 28;
    page.drawText("Informe de recorrido", {
      x: MARGIN,
      y,
      size: 22,
      font: fonts.bold,
      color: INK,
    });
    y -= 28;
    page.drawText(this.appName, {
      x: MARGIN,
      y,
      size: 12,
      font: fonts.regular,
      color: MUTED,
    });

    y -= 40;
    this.kv(page, fonts, "Título", detail.title, y);
    y -= 22;
    this.kv(page, fonts, "Ubicación", detail.location || "No indicada", y);
    y -= 22;
    this.kv(page, fonts, "Fecha", formatDate(detail.createdAt), y);
    y -= 22;
    this.kv(page, fonts, "Estado", detail.status, y);

    y -= 36;
    page.drawText("Resumen del análisis", {
      x: MARGIN,
      y,
      size: 14,
      font: fonts.bold,
      color: INK,
    });
    y -= 24;
    this.kv(page, fonts, "Fotografías", String(stats.photoCount), y);
    y -= 22;
    this.kv(page, fonts, "Baches detectados", String(stats.potholeCount), y);
    y -= 22;
    this.kv(page, fonts, "Análisis fallidos", String(stats.failedCount), y);

    if (stats.warnings.length > 0) {
      y -= 36;
      page.drawText("Avisos del analizador", {
        x: MARGIN,
        y,
        size: 14,
        font: fonts.bold,
        color: AMBER,
      });
      y -= 20;
      for (const warning of stats.warnings) {
        const lines = wrapText(warning, 90);
        for (const line of lines) {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: 10,
            font: fonts.regular,
            color: MUTED,
          });
          y -= 14;
        }
      }
    }

    page.drawText("Generado para entrega de inspección vial con drones.", {
      x: MARGIN,
      y: MARGIN,
      size: 9,
      font: fonts.regular,
      color: MUTED,
    });
  }

  private async drawImagePage(
    doc: PDFDocument,
    fonts: { regular: PDFFont; bold: PDFFont },
    detail: InspectionDetail,
    image: AerialImageWithReports,
    index: number,
  ) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const report = latestReport(image);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText(`Foto ${index} — ${detail.title}`, {
      x: MARGIN,
      y,
      size: 13,
      font: fonts.bold,
      color: INK,
    });
    y -= 18;
    page.drawText(image.originalName || image.id, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: MUTED,
    });
    y -= 16;
    const statusLabel = report?.status ?? "SIN INFORME";
    page.drawText(`Estado: ${statusLabel}    ${report?.summary ?? ""}`, {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.regular,
      color: report?.status === "FAILED" ? RED : INK,
    });
    y -= 18;

    const maxImgWidth = PAGE_WIDTH - MARGIN * 2;
    const maxImgHeight = 380;
    let imgBottom = y;

    try {
      const bytes = await this.storage.read(image.storageKey);
      const embedded = await this.embedImage(doc, bytes, image.mimeType);
      const scale = Math.min(maxImgWidth / embedded.width, maxImgHeight / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;
      const imgX = MARGIN;
      const imgY = y - drawH;
      page.drawImage(embedded, { x: imgX, y: imgY, width: drawW, height: drawH });

      if (report) {
        const factor = bboxScaleFromMeta(report.preprocessMeta);
        for (const pothole of report.potholes) {
          const box = scaledBbox(pothole, factor);
          const pageX = imgX + (box.x / embedded.width) * drawW;
          const pageH = (box.h / embedded.height) * drawH;
          const pageY = imgY + drawH - ((box.y + box.h) / embedded.height) * drawH;
          const pageW = (box.w / embedded.width) * drawW;
          page.drawRectangle({
            x: pageX,
            y: pageY,
            width: Math.max(pageW, 1),
            height: Math.max(pageH, 1),
            borderColor: AMBER,
            borderWidth: 1.25,
          });
        }
      }
      imgBottom = imgY;
    } catch {
      page.drawText("No se pudo incrustar la fotografía.", {
        x: MARGIN,
        y: y - 24,
        size: 10,
        font: fonts.regular,
        color: RED,
      });
      imgBottom = y - 40;
    }

    let tableY = imgBottom - 28;
    page.drawText("Detecciones", {
      x: MARGIN,
      y: tableY,
      size: 12,
      font: fonts.bold,
      color: INK,
    });
    tableY -= 18;

    const potholes = report?.potholes ?? [];
    if (potholes.length === 0) {
      page.drawText(
        report?.status === "FAILED"
          ? "El análisis de esta foto falló."
          : "Esta foto no tiene baches detectados.",
        {
          x: MARGIN,
          y: tableY,
          size: 10,
          font: fonts.regular,
          color: MUTED,
        },
      );
      return;
    }

    page.drawText("#    Confianza      Área (px)      Caja (x, y, w, h)", {
      x: MARGIN,
      y: tableY,
      size: 9,
      font: fonts.bold,
      color: MUTED,
    });
    tableY -= 14;

    const scale = bboxScaleFromMeta(report?.preprocessMeta);
    for (const [i, pothole] of potholes.entries()) {
      if (tableY < MARGIN + 20) break;
      const box = scaledBbox(pothole, scale);
      const conf =
        pothole.confidence != null ? `${Math.round(pothole.confidence * 100)}%` : "—";
      const area = pothole.areaPx != null ? Math.round(pothole.areaPx).toString() : "—";
      const line = `${i + 1}     ${conf.padEnd(8)}     ${area.padEnd(10)}     ${Math.round(box.x)}, ${Math.round(box.y)}, ${Math.round(box.w)}, ${Math.round(box.h)}`;
      page.drawText(line, {
        x: MARGIN,
        y: tableY,
        size: 9,
        font: fonts.regular,
        color: INK,
      });
      tableY -= 13;
    }

    const warning = warningFromMeta(report?.preprocessMeta);
    if (warning && tableY > MARGIN + 24) {
      tableY -= 10;
      for (const line of wrapText(`Aviso: ${warning}`, 92)) {
        page.drawText(line, {
          x: MARGIN,
          y: tableY,
          size: 8,
          font: fonts.regular,
          color: AMBER,
        });
        tableY -= 11;
      }
    }
  }

  private kv(
    page: PDFPage,
    fonts: { regular: PDFFont; bold: PDFFont },
    label: string,
    value: string,
    y: number,
  ) {
    page.drawText(`${label}:`, {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.bold,
      color: MUTED,
    });
    page.drawText(value, {
      x: MARGIN + 130,
      y,
      size: 11,
      font: fonts.regular,
      color: INK,
    });
  }

  private async embedImage(doc: PDFDocument, bytes: Buffer, mimeType: string) {
    const payload = new Uint8Array(bytes);
    if (mimeType.includes("png")) {
      return doc.embedPng(payload);
    }
    return doc.embedJpg(payload);
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
