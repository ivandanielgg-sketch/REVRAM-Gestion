"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Card, StatCard, Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { LOG_STATUS_LABELS, ALERT_SEVERITY_LABELS, SEVERITY_COLORS, STATUS_COLORS, BRAND_TITLE } from "@/lib/constants";
import { ClipboardList, History, BarChart3, Wrench, Settings } from "lucide-react";

interface DashboardData {
  boilers: { id: string; name: string; status: string; internalId: string }[];
  company?: { logoUrl: string | null; name: string } | null;
  stats: {
    totalBoilers: number;
    boilersOperating: number;
    openAlerts: number;
    pendingApproval: number;
    criticalAlerts: number;
  };
  recentLogs: {
    id: string;
    logDate: string;
    status: string;
    boiler: { name: string };
    operator: { username: string };
  }[];
  openAlerts: {
    id: string;
    alertDate: string;
    parameter: string;
    severity: string;
    boiler: { name: string };
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <LoadingState />;

  const quickLinks = [
    { href: "/logs/new", label: "Nueva bitácora", icon: ClipboardList },
    { href: "/logs", label: "Historial", icon: History },
    { href: "/reports", label: "Reportes", icon: BarChart3 },
    { href: "/maintenance", label: "Mantenimiento", icon: Wrench },
    { href: "/settings", label: "Configuración", icon: Settings },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen operativo de calderas y bitácoras"
      />

      {data.company?.logoUrl ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.company.logoUrl} alt={data.company.name} className="max-h-14 object-contain" />
        </div>
      ) : (
        <p className="mb-6 text-sm font-medium text-slate-700">{BRAND_TITLE}</p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calderas registradas" value={data.stats.totalBoilers} />
        <StatCard
          label="Operando"
          value={data.stats.boilersOperating}
          accent="normal"
        />
        <StatCard
          label="Alertas abiertas"
          value={data.stats.openAlerts}
          accent={data.stats.openAlerts > 0 ? "warning" : "normal"}
        />
        <StatCard
          label="Pendientes aprobación"
          value={data.stats.pendingApproval}
          accent={data.stats.pendingApproval > 0 ? "warning" : "normal"}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
            >
              <Icon className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-800">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Estado de calderas">
          <div className="space-y-2">
            {data.boilers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.internalId}</p>
                </div>
                <Badge className={STATUS_COLORS[b.status]}>{b.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
          <Link href="/boilers" className="mt-3 inline-block text-sm text-slate-600 hover:text-slate-900">
            Ver todas →
          </Link>
        </Card>

        <Card title="Alertas recientes">
          {data.openAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">Sin alertas abiertas</p>
          ) : (
            <div className="space-y-2">
              {data.openAlerts.map((a) => (
                <div key={a.id} className="rounded-md border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{a.parameter}</p>
                    <Badge className={SEVERITY_COLORS[a.severity]}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {a.boiler.name} · {formatDate(a.alertDate, true)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Link href="/alerts" className="mt-3 inline-block text-sm text-slate-600 hover:text-slate-900">
            Ver alertas →
          </Link>
        </Card>

        <Card title="Últimos registros de bitácora" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Caldera</th>
                  <th className="pb-2 pr-4">Operador</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4">{formatDate(log.logDate, true)}</td>
                    <td className="py-2 pr-4">{log.boiler.name}</td>
                    <td className="py-2 pr-4">{log.operator.username}</td>
                    <td className="py-2 pr-4">{LOG_STATUS_LABELS[log.status]}</td>
                    <td className="py-2">
                      <Link href={`/logs/${log.id}`} className="text-slate-600 hover:text-slate-900">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
