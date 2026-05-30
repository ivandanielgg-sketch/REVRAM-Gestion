import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { fetchReportData, type ReportType } from "@/lib/reports-service";
import { generateReportExport } from "@/lib/report-export";
import type { TrendPeriod } from "@/lib/report-metrics";

export const runtime = "nodejs";

const VALID_FORMATS = ["csv", "xlsx", "pdf"] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "reports.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const formatParam = searchParams.get("format") || "xlsx";
  if (!VALID_FORMATS.includes(formatParam as ExportFormat)) {
    return NextResponse.json({ error: "Formato inválido. Use csv, xlsx o pdf." }, { status: 400 });
  }
  const format = formatParam as ExportFormat;

  const type = (searchParams.get("type") || "daily") as ReportType;
  const period = (searchParams.get("period") || "week") as TrendPeriod;

  try {
    const data = await fetchReportData({
      type,
      boilerId: searchParams.get("boilerId") || undefined,
      period,
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    const { buffer, contentType, filename } = generateReportExport(
      data as Record<string, unknown>,
      format
    );

    const body =
      typeof buffer === "string"
        ? buffer
        : new Uint8Array(buffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al exportar reporte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
