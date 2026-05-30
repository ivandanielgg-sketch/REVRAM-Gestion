import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export function escapeCsvCell(value: string | number | null): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(sheets: ExportSheet[]): string {
  return sheets
    .map((sheet) => {
      const section = [
        `=== ${sheet.name} ===`,
        sheet.headers.join(","),
        ...sheet.rows.map((r) => r.map(escapeCsvCell).join(",")),
      ];
      return section.join("\n");
    })
    .join("\n\n");
}

export function buildXlsx(sheets: ExportSheet[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  meta?: string[];
  sheets: ExportSheet[];
}

export function buildPdf(options: PdfExportOptions): Buffer {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text(options.title, 14, 16);
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.text(options.subtitle, 14, 24);
  }
  if (options.meta?.length) {
    doc.setFontSize(9);
    doc.text(options.meta.join("  |  "), 14, options.subtitle ? 30 : 24);
  }

  let startY = options.subtitle ? 36 : options.meta?.length ? 30 : 28;

  for (const sheet of options.sheets) {
    if (startY > 180) {
      doc.addPage();
      startY = 16;
    }
    doc.setFontSize(11);
    doc.text(sheet.name, 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [sheet.headers],
      body: sheet.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 14, right: 14 },
    });
    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  doc.setFontSize(7);
  doc.text(
    "Sistema de apoyo documental. La validación normativa final debe ser realizada por personal calificado.",
    14,
    doc.internal.pageSize.height - 8
  );

  return Buffer.from(doc.output("arraybuffer"));
}

export function packageExport(
  sheets: ExportSheet[],
  format: ExportFormat,
  baseFilename: string,
  pdfOptions: Omit<PdfExportOptions, "sheets">
): { buffer: Buffer | string; contentType: string; filename: string } {
  if (sheets.length === 0 || sheets.every((s) => s.rows.length === 0)) {
    throw new Error("No hay datos para exportar");
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = `${baseFilename}-${dateStamp}`;

  if (format === "csv") {
    return {
      buffer: `\uFEFF${buildCsv(sheets)}`,
      contentType: "text/csv; charset=utf-8",
      filename: `${baseName}.csv`,
    };
  }

  if (format === "xlsx") {
    return {
      buffer: buildXlsx(sheets),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${baseName}.xlsx`,
    };
  }

  return {
    buffer: buildPdf({ ...pdfOptions, sheets }),
    contentType: "application/pdf",
    filename: `${baseName}.pdf`,
  };
}
