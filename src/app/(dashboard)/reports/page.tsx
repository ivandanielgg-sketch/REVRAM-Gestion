"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/Common";
import { Card, StatCard } from "@/components/ui/Card";
import { Select, Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";
import {
  TREND_METRICS,
  TREND_GROUP_LABELS,
  STANDARD_BOILER_METRICS,
  PERIOD_LABELS,
  type TrendPeriod,
  type TrendMetric,
  type IncidentPoint,
} from "@/lib/report-metrics";
import {
  ALERT_SEVERITY_LABELS,
  LOG_STATUS_LABELS,
} from "@/lib/constants";

type ReportType = "daily" | "open-alerts" | "pending-approval" | "critical-events" | "trends";

interface BoilerOption {
  id: string;
  name: string;
}

interface DailyReport {
  type: "daily";
  summary: {
    logsToday: number;
    alertsToday: number;
    openAlerts: number;
    criticalAlerts: number;
    boilersOperating: number;
  };
  logs: DailyLog[];
  alerts: DailyAlert[];
}

interface DailyLog {
  id: string;
  logDate: string;
  shift: string;
  status: string;
  steamPressure: number | null;
  steamTemperature: number | null;
  waterLevel: number | null;
  operationalState: string;
  boiler: { name: string };
  operator: { username: string };
}

interface DailyAlert {
  id: string;
  alertDate: string;
  parameter: string;
  recordedValue: string | null;
  configuredLimit?: string | null;
  severity: string;
  status: string;
  boiler: { name: string };
  capturedBy: { username: string };
}

interface TrendsReport {
  type: "trends";
  period: TrendPeriod;
  startDate?: string;
  endDate?: string;
  trends: Record<string, string | number>[];
  incidents: IncidentPoint[];
  recordCount: number;
  totalIncidents: number;
}

interface ListReport {
  type: "open-alerts" | "pending-approval" | "critical-events";
  alerts?: DailyAlert[];
  logs?: DailyLog[];
  total: number;
}

type ReportData = DailyReport | TrendsReport | ListReport | null;

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | null)[][];
}) {
  if (rows.length === 0) return <EmptyState message="No hay registros para mostrar." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-700">
                  {cell ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricChart({
  data,
  metric,
}: {
  data: Record<string, string | number>[];
  metric: TrendMetric;
}) {
  const hasData = data.some((d) => typeof d[metric.key] === "number");
  if (!hasData) return null;

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">
        {metric.label}
        {metric.unit ? ` (${metric.unit})` : ""}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={45} />
          <Tooltip
            formatter={(value) => [
              typeof value === "number" ? value.toLocaleString("es-MX") : value,
              metric.label,
            ]}
          />
          <Line
            type="monotone"
            dataKey={metric.key}
            stroke={metric.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendsView({ data }: { data: TrendsReport }) {
  const groups = Object.keys(TREND_GROUP_LABELS) as TrendMetric["group"][];
  const hasLogs = data.recordCount > 0;
  const hasIncidents = data.totalIncidents > 0;

  if (!hasLogs && !hasIncidents) {
    return (
      <EmptyState message="No hay bitácoras ni incidencias en el periodo seleccionado." />
    );
  }

  const standardVisible = STANDARD_BOILER_METRICS.filter((m) =>
    data.trends.some((d) => typeof d[m.key] === "number")
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registros analizados" value={data.recordCount} />
        <StatCard label="Incidencias totales" value={data.totalIncidents} accent="warning" />
        <StatCard label="Periodo" value={PERIOD_LABELS[data.period]} />
        <StatCard label="Puntos en gráfica" value={data.trends.length} />
      </div>

      {standardVisible.length > 0 && (
        <Card title="Parámetros principales de caldera">
          <p className="mb-4 text-sm text-slate-600">
            Tendencia de presión, temperatura, nivel de agua y parámetros clave para comparación visual.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {standardVisible.map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={`${m.label}${m.unit ? ` (${m.unit})` : ""}`}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {standardVisible.slice(0, 3).map((metric) => (
              <MetricChart key={metric.key} data={data.trends} metric={metric} />
            ))}
          </div>
        </Card>
      )}

      {hasIncidents && (
        <Card title="Incidencias por periodo">
          <p className="mb-4 text-sm text-slate-600">
            Número de alertas registradas agrupadas por día, mes o año según el rango seleccionado.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.incidents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="critico" name="Crítico" stackId="a" fill="#dc2626" />
              <Bar dataKey="advertencia" name="Advertencia" stackId="a" fill="#ca8a04" />
              <Bar dataKey="informativo" name="Informativo" stackId="a" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.incidents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total incidencias" stroke="#334155" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasLogs &&
        groups.map((group) => {
          const metrics = TREND_METRICS.filter((m) => m.group === group);
          const visible = metrics.filter((m) =>
            data.trends.some((d) => typeof d[m.key] === "number")
          );
          if (visible.length === 0) return null;

          return (
            <Card key={group} title={TREND_GROUP_LABELS[group]}>
              <div className="grid gap-4 md:grid-cols-2">
                {visible.map((metric) => (
                  <MetricChart key={metric.key} data={data.trends} metric={metric} />
                ))}
              </div>
            </Card>
          );
        })}
    </div>
  );
}

function DailyView({ data, hasRange }: { data: DailyReport; hasRange: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={hasRange ? "Bitácoras" : "Bitácoras hoy"} value={data.summary.logsToday} />
        <StatCard label={hasRange ? "Alertas" : "Alertas hoy"} value={data.summary.alertsToday} accent="warning" />
        <StatCard label="Alertas abiertas" value={data.summary.openAlerts} accent="warning" />
        <StatCard
          label="Alertas críticas"
          value={data.summary.criticalAlerts}
          accent={data.summary.criticalAlerts > 0 ? "critical" : "normal"}
        />
        <StatCard label="Calderas operando" value={data.summary.boilersOperating} />
      </div>

      <Card title={hasRange ? "Bitácoras del periodo" : "Bitácoras del día"}>
        <DataTable
          headers={["Fecha", "Caldera", "Turno", "Presión", "Temp.", "Nivel", "Operador", "Estado"]}
          rows={data.logs.map((l) => [
            formatDate(l.logDate, true),
            l.boiler.name,
            l.shift,
            l.steamPressure != null ? `${l.steamPressure} psi` : null,
            l.steamTemperature != null ? `${l.steamTemperature} °C` : null,
            l.waterLevel != null ? `${l.waterLevel} %` : null,
            l.operator.username,
            LOG_STATUS_LABELS[l.status] || l.status,
          ])}
        />
      </Card>

      <Card title={hasRange ? "Alertas del periodo" : "Alertas del día"}>
        <DataTable
          headers={["Fecha", "Caldera", "Parámetro", "Valor", "Severidad", "Estado", "Capturada por"]}
          rows={data.alerts.map((a) => [
            formatDate(a.alertDate, true),
            a.boiler.name,
            a.parameter,
            a.recordedValue,
            ALERT_SEVERITY_LABELS[a.severity] || a.severity,
            a.status,
            a.capturedBy.username,
          ])}
        />
      </Card>
    </div>
  );
}

function AlertsView({ alerts }: { alerts: DailyAlert[] }) {
  return (
    <Card title={`Alertas (${alerts.length})`}>
      <DataTable
        headers={["Fecha", "Caldera", "Parámetro", "Valor", "Límite", "Severidad", "Estado", "Capturada por"]}
        rows={alerts.map((a) => [
          formatDate(a.alertDate, true),
          a.boiler.name,
          a.parameter,
          a.recordedValue,
          a.configuredLimit ?? "—",
          ALERT_SEVERITY_LABELS[a.severity] || a.severity,
          a.status,
          a.capturedBy.username,
        ])}
      />
    </Card>
  );
}

function LogsView({ logs }: { logs: DailyLog[] }) {
  return (
    <Card title={`Bitácoras (${logs.length})`}>
      <DataTable
        headers={["Fecha", "Caldera", "Turno", "Presión", "Nivel", "Operador", "Estado"]}
        rows={logs.map((l) => [
          formatDate(l.logDate, true),
          l.boiler.name,
          l.shift,
          l.steamPressure != null ? `${l.steamPressure} psi` : null,
          l.waterLevel != null ? `${l.waterLevel} %` : null,
          l.operator.username,
          LOG_STATUS_LABELS[l.status] || l.status,
        ])}
      />
    </Card>
  );
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("trends");
  const [period, setPeriod] = useState<TrendPeriod>("week");
  const [boilerId, setBoilerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [boilers, setBoilers] = useState<BoilerOption[]>([]);
  const [data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasDateRange = Boolean(startDate || endDate);
  const effectivePeriod: TrendPeriod =
    reportType === "trends" && hasDateRange ? "custom" : period;

  function buildParams(forExport = false): URLSearchParams {
    const params = new URLSearchParams({ type: reportType });
    if (boilerId) params.set("boilerId", boilerId);
    if (reportType === "trends") params.set("period", effectivePeriod);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (forExport) return params;
    return params;
  }

  function exportReport(format: "csv" | "xlsx" | "pdf") {
    const params = buildParams(true);
    params.set("format", format);
    window.open(`/api/reports/export?${params}`, "_blank");
  }

  useEffect(() => {
    fetch("/api/boilers")
      .then((r) => r.json())
      .then(setBoilers)
      .catch(() => setBoilers([]));
  }, []);

  const loadReport = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = buildParams();

    fetch(`/api/reports?${params}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Error al cargar reporte");
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al cargar reporte");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [reportType, boilerId, period, startDate, endDate, effectivePeriod]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function renderReport() {
    if (!data) return null;

    if (data.type === "daily") return <DailyView data={data} hasRange={hasDateRange} />;

    if (data.type === "trends") return <TrendsView data={data} />;

    if ("alerts" in data && data.alerts) {
      return (
        <div className="space-y-4">
          {data.type === "critical-events" && (
            <p className="text-sm text-slate-600">
              Eventos con severidad crítica registrados en el sistema.
            </p>
          )}
          <AlertsView alerts={data.alerts} />
        </div>
      );
    }

    if ("logs" in data && data.logs) {
      return <LogsView logs={data.logs} />;
    }

    return <EmptyState message="No hay datos para este reporte." />;
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Reportes operativos y tendencias de parámetros por periodo"
      />

      <div className="mb-6 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label>Tipo de reporte</Label>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
          >
            <option value="daily">Resumen diario</option>
            <option value="trends">Panel gráfico (tendencias e incidencias)</option>
            <option value="open-alerts">Alertas abiertas</option>
            <option value="pending-approval">Pendientes de aprobación</option>
            <option value="critical-events">Eventos críticos</option>
          </Select>
        </div>

        {reportType === "trends" && !hasDateRange && (
          <div>
            <Label>Periodo</Label>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as TrendPeriod)}>
              {Object.entries(PERIOD_LABELS)
                .filter(([key]) => key !== "custom")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </Select>
          </div>
        )}

        <div>
          <Label>Desde</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Hasta</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Caldera</Label>
          <Select value={boilerId} onChange={(e) => setBoilerId(e.target.value)}>
            <option value="">Todas</option>
            {boilers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button onClick={loadReport} disabled={loading}>
            {loading ? "Generando..." : "Generar"}
          </Button>
          <Button variant="secondary" onClick={() => exportReport("xlsx")} disabled={loading || !data}>
            Excel
          </Button>
          <Button variant="secondary" onClick={() => exportReport("pdf")} disabled={loading || !data}>
            PDF
          </Button>
          <Button variant="secondary" onClick={() => exportReport("csv")} disabled={loading || !data}>
            CSV
          </Button>
        </div>
      </div>

      {hasDateRange && (
        <p className="mb-4 text-sm text-slate-600">
          Filtrando por rango: {startDate || "inicio"} — {endDate || "hoy"}
          {reportType === "trends" && " (periodo personalizado en gráficas)"}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? <LoadingState /> : renderReport()}
    </div>
  );
}
