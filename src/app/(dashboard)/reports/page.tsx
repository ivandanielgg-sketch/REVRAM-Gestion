"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Card } from "@/components/ui/Card";
import { Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [boilerId, setBoilerId] = useState("");
  const [boilers, setBoilers] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/boilers").then((r) => r.json()).then(setBoilers);
  }, []);

  function loadReport() {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (boilerId) params.set("boilerId", boilerId);
    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const trends = (data?.trends as { date: string; steamPressure: number; flueGasTemperature: number; o2: number; co: number; conductivity: number; ph: number }[]) || [];

  return (
    <div>
      <PageHeader title="Reportes" description="Reportes básicos de operación" />
      <div className="mb-6 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label>Tipo de reporte</Label>
          <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="daily">Resumen diario</option>
            <option value="open-alerts">Alertas abiertas</option>
            <option value="pending-approval">Pendientes de aprobación</option>
            <option value="critical-events">Eventos críticos</option>
            <option value="trends">Tendencia de parámetros</option>
          </Select>
        </div>
        <div>
          <Label>Caldera</Label>
          <Select value={boilerId} onChange={(e) => setBoilerId(e.target.value)}>
            <option value="">Todas</option>
            {boilers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={loadReport}>Generar</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : reportType === "trends" && trends.length > 0 ? (
        <div className="space-y-6">
          {[
            { key: "steamPressure", label: "Presión de vapor", color: "#334155" },
            { key: "flueGasTemperature", label: "Temperatura de gases", color: "#dc2626" },
            { key: "o2", label: "O2", color: "#2563eb" },
            { key: "co", label: "CO", color: "#ca8a04" },
            { key: "conductivity", label: "Conductividad", color: "#7c3aed" },
            { key: "ph", label: "pH", color: "#059669" },
          ].map((param) => (
            <Card key={param.key} title={param.label}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends.map((t) => ({ ...t, date: formatDate(t.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={param.key} stroke={param.color} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ))}
        </div>
      ) : (
        <Card title="Resultados">
          <pre className="max-h-96 overflow-auto text-xs text-slate-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
