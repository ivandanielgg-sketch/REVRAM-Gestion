import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { fetchReportData, type ReportType } from "@/lib/reports-service";
import type { TrendPeriod } from "@/lib/report-metrics";

const VALID_TYPES: ReportType[] = [
  "daily",
  "open-alerts",
  "pending-approval",
  "critical-events",
  "trends",
];

const VALID_PERIODS: TrendPeriod[] = ["day", "week", "month", "year", "custom"];

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "reports.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") || "daily";
  const type = VALID_TYPES.includes(typeParam as ReportType)
    ? (typeParam as ReportType)
    : "daily";
  const periodParam = searchParams.get("period") || "week";
  const period = VALID_PERIODS.includes(periodParam as TrendPeriod)
    ? (periodParam as TrendPeriod)
    : "week";

  const data = await fetchReportData({
    type,
    boilerId: searchParams.get("boilerId") || undefined,
    period,
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
  });

  return NextResponse.json(data);
}
