"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; module: string; createdAt: string; user: { username: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setAuditLogs(data);
        setLoading(false);
      });
  }, []);

  async function createPlant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/plants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Plantas, catálogos y auditoría" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nueva planta / cliente">
          <form onSubmit={createPlant} className="space-y-4">
            <div>
              <Label>Nombre planta</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input name="client" required />
            </div>
            <div>
              <Label>Ubicación</Label>
              <Input name="location" />
            </div>
            <Button type="submit">Registrar planta</Button>
          </form>
        </Card>

        <Card title="Auditoría reciente">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded border border-slate-100 px-3 py-2">
                  <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">
                    {log.module} · {log.user?.username || "Sistema"} · {formatDate(log.createdAt, true)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
