import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "logs.export");
  if (error) return error;

  const url = new URL(request.url);
  const logsUrl = `${url.origin}/api/logs?${url.searchParams.toString()}`;
  const res = await fetch(logsUrl, {
    headers: { cookie: request.headers.get("cookie") || "" },
  });
  const logs = await res.json();

  const headers = [
    "Fecha",
    "Caldera",
    "Operador",
    "Turno",
    "Estado",
    "Presión vapor",
    "Nivel agua",
    "Estado registro",
  ];

  const rows = logs.map(
    (l: {
      logDate: string;
      boiler: { name: string };
      operator: { username: string };
      shift: string;
      operationalState: string;
      steamPressure: number | null;
      waterLevel: number | null;
      status: string;
    }) =>
      [
        l.logDate,
        l.boiler.name,
        l.operator.username,
        l.shift,
        l.operationalState,
        l.steamPressure ?? "",
        l.waterLevel ?? "",
        l.status,
      ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bitacoras.csv"',
    },
  });
}
