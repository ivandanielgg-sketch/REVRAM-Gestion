"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { COMPANY_STATUS_LABELS } from "@/lib/constants";

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count: { users: number; boilers: number };
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/companies");
    setCompanies(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowForm(false);
    load();
  }

  async function updateCompany(id: string, data: { name?: string; status?: string }) {
    await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Administración de empresas"
        description="Empresas registradas en la plataforma REVRAM"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "Nueva empresa"}
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={createCompany}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex-1">
            <Label>Nombre de empresa</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <Button type="submit">Crear empresa</Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Usuarios</th>
              <th className="px-4 py-3">Equipos</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <Badge>{COMPANY_STATUS_LABELS[c.status] || c.status}</Badge>
                </td>
                <td className="px-4 py-3">{c._count.users}</td>
                <td className="px-4 py-3">{c._count.boilers}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {c.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateCompany(c.id, { status: "DISABLED" })}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => updateCompany(c.id, { status: "ACTIVE" })}>
                        Activar
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
