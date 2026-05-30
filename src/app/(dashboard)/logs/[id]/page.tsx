"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Card, Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { LOG_STATUS_LABELS, ALERT_SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/constants";

interface LogDetail {
  id: string;
  logDate: string;
  boilerId: string;
  shift: string;
  status: string;
  operationalState: string;
  steamPressure: number | null;
  waterLevel: number | null;
  operatorSignature: string | null;
  generalObservations: string | null;
  abnormalCondition: string | null;
  requiresMaintenance: boolean;
  maintenancePriority: string | null;
  operator: { username: string };
  boiler: { name: string };
  combustion: Record<string, unknown> | null;
  waterTreatment: Record<string, unknown> | null;
  safetyChecklist: { itemLabel: string; response: string }[];
  alerts: { id: string; parameter: string; severity: string; recordedValue: string }[];
}

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [log, setLog] = useState<LogDetail | null>(null);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ role: string } | null>(null);

  function load() {
    Promise.all([
      fetch(`/api/logs/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([l, s]) => {
      setLog(l);
      setSession(s.user);
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve(action: string) {
    setError("");
    const res = await fetch(`/api/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, supervisorComments: comments }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    load();
  }

  async function createCorrection() {
    const res = await fetch(`/api/logs/${id}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) router.push(`/logs/${data.id}`);
    else setError(data.error);
  }

  async function createMaintenanceFromLog() {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boilerId: log?.boilerId,
        type: "CORRECTIVO",
        priority: log?.maintenancePriority || "MEDIA",
        description: `Generado desde bitácora ${id}`,
        finding: log?.abnormalCondition || "",
        boilerLogId: id,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/maintenance/${data.id}`);
    else setError(data.error);
  }

  if (!log) return <LoadingState />;

  const canApprove = session?.role === "ADMINISTRADOR" || session?.role === "SUPERVISOR";
  const isApproved = log.status === "APROBADO";

  return (
    <div>
      <PageHeader
        title="Detalle de bitácora"
        description={`${log.boiler.name} · ${formatDate(log.logDate, true)}`}
        action={
          <Link href="/logs">
            <Button variant="secondary">Volver</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge className="bg-slate-100 text-slate-800">
          {LOG_STATUS_LABELS[log.status]}
        </Badge>
        {isApproved && (
          <Badge className="bg-green-100 text-green-800">Registro protegido</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Datos generales">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Operador</dt><dd>{log.operator.username}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Turno</dt><dd>{log.shift}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Estado operativo</dt><dd>{log.operationalState}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Presión vapor</dt><dd>{String(log.steamPressure ?? "—")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Nivel agua</dt><dd>{String(log.waterLevel ?? "—")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Firma operador</dt><dd>{log.operatorSignature || "—"}</dd></div>
          </dl>
        </Card>

        <Card title="Combustión">
          {log.combustion ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(log.combustion as Record<string, unknown>).filter(([k]) => k !== "id" && k !== "boilerLogId").map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt>
                  <dd>{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Sin datos</p>
          )}
        </Card>

        <Card title="Tratamiento de agua">
          {log.waterTreatment ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(log.waterTreatment as Record<string, unknown>).filter(([k]) => !["id", "boilerLogId"].includes(k)).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt>
                  <dd>{typeof v === "boolean" ? (v ? "Sí" : "No") : String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Sin datos</p>
          )}
        </Card>

        <Card title="Checklist de seguridad">
          <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {(log.safetyChecklist ?? []).map((item) => (
              <div key={item.itemLabel} className="flex justify-between border-b border-slate-50 py-1">
                <span>{item.itemLabel}</span>
                <span className={item.response === "NO_CUMPLE" ? "text-red-600" : "text-green-700"}>
                  {item.response}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {log.alerts.length > 0 && (
          <Card title="Alertas generadas" className="lg:col-span-2">
            <div className="space-y-2">
              {log.alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-slate-100 px-3 py-2">
                  <span className="text-sm">{a.parameter}: {a.recordedValue}</span>
                  <Badge className={SEVERITY_COLORS[a.severity]}>
                    {ALERT_SEVERITY_LABELS[a.severity]}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {log.generalObservations && (
          <Card title="Observaciones" className="lg:col-span-2">
            <p className="text-sm">{log.generalObservations}</p>
          </Card>
        )}
      </div>

      {canApprove && !isApproved && ["ENVIADO", "REVISADO", "BORRADOR"].includes(log.status) && (
        <Card title="Revisión del supervisor" className="mt-6">
          <Textarea
            placeholder="Comentarios del supervisor"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => approve("REVISAR")}>Marcar revisado</Button>
            <Button onClick={() => approve("APROBAR")}>Aprobar</Button>
            <Button variant="secondary" onClick={() => approve("RECHAZAR")}>Rechazar</Button>
            <Button variant="danger" onClick={() => approve("BLOQUEAR")}>Bloquear</Button>
          </div>
        </Card>
      )}

      {isApproved && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={createCorrection}>
            Crear nota de corrección
          </Button>
          {log.requiresMaintenance && (
            <Button onClick={createMaintenanceFromLog}>Generar orden de mantenimiento</Button>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
