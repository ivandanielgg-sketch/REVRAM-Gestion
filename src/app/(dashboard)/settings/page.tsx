"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { PLANT_STATUS_LABELS, BRAND_TITLE } from "@/lib/constants";

interface Plant {
  id: string;
  name: string;
  client: string | null;
  address: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  company?: { id: string; name: string } | null;
}

interface SessionUser {
  role: string;
}

export default function SettingsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; module: string; createdAt: string; user: { username: string } | null }[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPlant, setSavingPlant] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isSuperAdmin = session?.role === "SUPER_ADMIN";
  const canManageLogo = session?.role === "SUPER_ADMIN" || session?.role === "COMPANY_ADMIN";

  async function loadPlants() {
    const res = await fetch("/api/plants");
    const data = await res.json();
    setPlants(data);
  }

  useEffect(() => {
    Promise.all([
      loadPlants(),
      fetch("/api/audit?limit=50").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/company/logo").then((r) => r.json()),
    ]).then(([, audit, me, logo]) => {
      setAuditLogs(audit);
      setSession(me.user);
      setLogoUrl(logo.logoUrl || "");
      setLogoPreview(logo.logoUrl || null);
      setLoading(false);
    });
  }, []);

  async function createPlant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPlant(true);
    setError("");
    setSuccess("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/plants/${editingId}` : "/api/plants";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSavingPlant(false);
    if (!res.ok) {
      setError(data.error || "Error al guardar");
      return;
    }
    setSuccess(editingId ? "Planta actualizada correctamente." : "Planta o cliente registrada correctamente.");
    setEditingId(null);
    e.currentTarget.reset();
    await loadPlants();
  }

  async function disablePlant(id: string) {
    await fetch(`/api/plants/${id}`, { method: "PATCH" });
    await loadPlants();
  }

  async function deletePlant(id: string) {
    if (!confirm("¿Eliminar o desactivar esta planta/cliente?")) return;
    await fetch(`/api/plants/${id}`, { method: "DELETE" });
    await loadPlants();
  }

  function startEdit(plant: Plant) {
    setEditingId(plant.id);
    setSuccess("");
    setError("");
  }

  async function saveLogo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingLogo(true);
    setError("");
    const res = await fetch("/api/company/logo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: logoUrl || null }),
    });
    const data = await res.json();
    setSavingLogo(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setLogoPreview(data.logoUrl);
    setSuccess("Logo actualizado correctamente.");
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Configuración" description="Plantas, logo de empresa y auditoría" />

      {success && <p className="mb-4 rounded bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}
      {error && <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={editingId ? "Editar planta / cliente" : "Nueva planta / cliente"}>
          <form onSubmit={createPlant} className="space-y-4" key={editingId || "new"}>
            <div>
              <Label>Nombre de planta y/o cliente *</Label>
              <Input name="name" required defaultValue={editingId ? plants.find((p) => p.id === editingId)?.name : ""} />
            </div>
            <div><Label>Cliente</Label><Input name="client" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.client || "" : ""} /></div>
            <div><Label>Dirección</Label><Input name="address" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.address || "" : ""} /></div>
            <div><Label>Contacto</Label><Input name="contact" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.contact || "" : ""} /></div>
            <div><Label>Teléfono</Label><Input name="phone" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.phone || "" : ""} /></div>
            <div><Label>Correo</Label><Input name="email" type="email" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.email || "" : ""} /></div>
            <div><Label>Notas</Label><Input name="notes" defaultValue={editingId ? plants.find((p) => p.id === editingId)?.notes || "" : ""} /></div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingPlant}>
                {savingPlant ? "Guardando..." : editingId ? "Actualizar" : "Registrar planta"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancelar edición</Button>
              )}
            </div>
          </form>
        </Card>

        {canManageLogo && (
          <Card title="Logo de empresa">
            <form onSubmit={saveLogo} className="space-y-4">
              <div>
                <Label>URL del logo</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="rounded border border-slate-200 p-4">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo empresa" className="max-h-16 object-contain" />
                ) : (
                  <p className="text-sm text-slate-600">{BRAND_TITLE}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingLogo}>{savingLogo ? "Guardando..." : "Guardar logo"}</Button>
                <Button type="button" variant="secondary" onClick={() => { setLogoUrl(""); setLogoPreview(null); }}>
                  Eliminar logo
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card title="Plantas / clientes registrados" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2">Nombre</th>
                  {isSuperAdmin && <th className="px-3 py-2">Empresa</th>}
                  <th className="px-3 py-2">Fecha de alta</th>
                  <th className="px-3 py-2">Estatus</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    {isSuperAdmin && <td className="px-3 py-2">{p.company?.name || "—"}</td>}
                    <td className="px-3 py-2">{formatDate(p.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Badge>{PLANT_STATUS_LABELS[p.status] || p.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="text-slate-600 hover:text-slate-900" onClick={() => startEdit(p)}>Editar</button>
                        <button type="button" className="text-amber-600 hover:text-amber-800" onClick={() => disablePlant(p.id)}>Desactivar</button>
                        <button type="button" className="text-red-600 hover:text-red-800" onClick={() => deletePlant(p.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Auditoría reciente" className="lg:col-span-2">
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
        </Card>
      </div>
    </div>
  );
}
