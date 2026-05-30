"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { ALERT_SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/constants";

interface Alert {
  id: string;
  alertDate: string;
  parameter: string;
  recordedValue: string | null;
  configuredLimit: string | null;
  severity: string;
  status: string;
  boiler: { id: string; name: string };
  capturedBy: { username: string };
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeComments, setCloseComments] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function closeAlert(id: string, alertSeverity: string) {
    if (alertSeverity === "CRITICO" && !closeComments.trim()) {
      alert("Comentario requerido para cerrar alerta crítica");
      return;
    }
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closeComments, status: "CERRADA" }),
    });
    setClosingId(null);
    setCloseComments("");
    load();
  }

  async function createMaintenance(alert: Alert) {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boilerId: alert.boiler.id,
        type: "CORRECTIVO",
        priority: alert.severity === "CRITICO" ? "CRITICA" : "ALTA",
        description: `Alerta: ${alert.parameter} - Valor: ${alert.recordedValue}`,
        alertId: alert.id,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/maintenance/${data.id}`);
  }

  return (
    <div>
      <PageHeader title="Alertas" description="Alertas automáticas por límites operativos" />
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label>Estado</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="ABIERTA">Abierta</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="CERRADA">Cerrada</option>
          </Select>
        </div>
        <div>
          <Label>Severidad</Label>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas</option>
            <option value="NORMAL">Normal</option>
            <option value="ADVERTENCIA">Advertencia</option>
            <option value="CRITICO">Crítico</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={load}>Filtrar</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_COLORS[a.severity]}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </Badge>
                    <span className="text-xs text-slate-500">{a.status}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{a.parameter}</p>
                  <p className="text-sm text-slate-600">
                    {a.boiler.name} · Valor: {a.recordedValue} · Límite: {a.configuredLimit}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(a.alertDate, true)} · {a.capturedBy.username}
                  </p>
                </div>
                {a.status !== "CERRADA" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setClosingId(a.id)}>
                      Cerrar
                    </Button>
                    {a.severity === "CRITICO" && (
                      <Button size="sm" onClick={() => createMaintenance(a)}>
                        Crear mantenimiento
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {closingId === a.id && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Textarea
                    placeholder="Comentarios de cierre (requerido si es crítica)"
                    value={closeComments}
                    onChange={(e) => setCloseComments(e.target.value)}
                    rows={2}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => closeAlert(a.id, a.severity)}>
                      Confirmar cierre
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setClosingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
