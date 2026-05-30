"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { LOG_STATUS_LABELS } from "@/lib/constants";

interface Log {
  id: string;
  logDate: string;
  shift: string;
  status: string;
  steamPressure: number | null;
  waterLevel: number | null;
  requiresMaintenance: boolean;
  boiler: { name: string; plant: { client: string } | null };
  operator: { username: string };
}

export default function LogsHistoryPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [boilers, setBoilers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    boilerId: "",
    shift: "",
    status: "",
    search: "",
  });

  function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    fetch(`/api/logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/boilers").then((r) => r.json()).then(setBoilers);
    loadLogs();
  }, []);

  function exportLogs(format: "csv" | "xlsx" | "pdf") {
    const params = new URLSearchParams(filters as Record<string, string>);
    params.set("format", format);
    window.open(`/api/logs/export?${params}`, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="Historial de bitácoras"
        description="Consulta y filtrado de registros históricos"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportLogs("xlsx")} disabled={loading || logs.length === 0}>
              Excel
            </Button>
            <Button variant="secondary" onClick={() => exportLogs("pdf")} disabled={loading || logs.length === 0}>
              PDF
            </Button>
            <Button variant="secondary" onClick={() => exportLogs("csv")} disabled={loading || logs.length === 0}>
              CSV
            </Button>
            <Link href="/logs/new">
              <Button>Nueva bitácora</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <Label>Desde</Label>
          <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
        </div>
        <div>
          <Label>Caldera</Label>
          <Select value={filters.boilerId} onChange={(e) => setFilters({ ...filters, boilerId: e.target.value })}>
            <option value="">Todas</option>
            {boilers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Turno</Label>
          <Select value={filters.shift} onChange={(e) => setFilters({ ...filters, shift: e.target.value })}>
            <option value="">Todos</option>
            <option value="MATUTINO">Matutino</option>
            <option value="VESPERTINO">Vespertino</option>
            <option value="NOCTURNO">Nocturno</option>
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(LOG_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input placeholder="Texto libre..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <div className="flex items-end lg:col-span-6">
          <Button onClick={loadLogs}>Filtrar</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Caldera</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Presión</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{formatDate(log.logDate, true)}</td>
                  <td className="px-4 py-3">{log.boiler.name}</td>
                  <td className="px-4 py-3">{log.operator.username}</td>
                  <td className="px-4 py-3">{log.shift}</td>
                  <td className="px-4 py-3">{log.steamPressure ?? "—"}</td>
                  <td className="px-4 py-3">{log.waterLevel ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-slate-100 text-slate-700">{LOG_STATUS_LABELS[log.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/logs/${log.id}`} className="text-slate-600 hover:text-slate-900">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
