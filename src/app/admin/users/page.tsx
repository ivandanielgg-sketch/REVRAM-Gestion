"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
  rejectionReason?: string | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "PENDING_APPROVAL", label: "Pendientes" },
  { value: "ACTIVE", label: "Activos" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "DISABLED", label: "Deshabilitados" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (companyFilter) params.set("companyId", companyFilter);
    if (roleFilter) params.set("role", roleFilter);
    if (emailFilter) params.set("email", emailFilter);

    const [usersRes, companiesRes] = await Promise.all([
      fetch(`/api/admin/users?${params}`),
      fetch("/api/admin/companies"),
    ]);
    setUsers(await usersRes.json());
    setCompanies(await companiesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter, companyFilter, roleFilter, emailFilter]);

  async function approve(id: string) {
    await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
    load();
  }

  async function reject(id: string) {
    const reason = window.prompt("Motivo de rechazo (opcional):") || "";
    await fetch(`/api/admin/users/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    load();
  }

  async function updateUser(id: string, data: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function removeUser(id: string) {
    if (!window.confirm("¿Eliminar usuario (baja lógica)?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <LoadingState />;

  const pending = users.filter((u) => u.status === "PENDING_APPROVAL");

  return (
    <div>
      <PageHeader
        title="Administración de usuarios"
        description="Autorización, roles y gestión multiempresa"
      />

      {pending.length > 0 && (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-900">
            Usuarios pendientes ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-100 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-slate-600">{u.email}</p>
                  <p className="text-slate-500">
                    {u.company?.name} · {formatDate(u.createdAt, true)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(u.id)}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => reject(u.id)}>
                    Rechazar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => removeUser(u.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filtrar por correo"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Creación</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.company?.name || "—"}</td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="min-w-[140px]"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Badge>{USER_STATUS_LABELS[u.status] || u.status}</Badge>
                </td>
                <td className="px-4 py-3">{formatDate(u.createdAt, true)}</td>
                <td className="px-4 py-3">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.status === "PENDING_APPROVAL" && (
                      <Button size="sm" onClick={() => approve(u.id)}>
                        Aprobar
                      </Button>
                    )}
                    {u.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateUser(u.id, { status: "DISABLED" })}
                      >
                        Deshabilitar
                      </Button>
                    )}
                    {u.status === "DISABLED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateUser(u.id, { status: "ACTIVE" })}
                      >
                        Reactivar
                      </Button>
                    )}
                    {u.status !== "DELETED" && (
                      <Button size="sm" variant="secondary" onClick={() => removeUser(u.id)}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
