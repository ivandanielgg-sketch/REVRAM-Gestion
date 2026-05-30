import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { parseLogsFilters, fetchFilteredLogs } from "@/lib/logs-query";
import { generateLogsExport } from "@/lib/logs-export";
import type { ExportFormat } from "@/lib/export-utils";

export const runtime = "nodejs";

const VALID_FORMATS: ExportFormat[] = ["csv", "xlsx", "pdf"];

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "logs.export");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const formatParam = searchParams.get("format") || "csv";
  if (!VALID_FORMATS.includes(formatParam as ExportFormat)) {
    return NextResponse.json(
      { error: "Formato inválido. Use csv, xlsx o pdf." },
      { status: 400 }
    );
  }
  const format = formatParam as ExportFormat;

  try {
    const filters = parseLogsFilters(searchParams);
    const logs = await fetchFilteredLogs(filters, true);
    const { buffer, contentType, filename } = generateLogsExport(logs, format, {
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const body = typeof buffer === "string" ? buffer : new Uint8Array(buffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al exportar bitácoras";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
