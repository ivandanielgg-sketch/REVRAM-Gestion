"use client";

import { useEffect, useState } from "react";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), status: "ACTIVE" }),
    });
    setShowForm(false);
    load();
  }

  async function toggleStatus(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    load();
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Usuarios de empresa"
        description="Administración de usuarios de su organización"
        action={<Button onClick={() => setShowForm(!showForm)}>Nuevo usuario</Button>}
      />

      {showForm && (
        <form onSubmit={createUser} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Usuario</Label>
              <Input name="username" required />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Correo</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input name="password" type="password" required minLength={8} />
            </div>
            <div>
              <Label>Rol</Label>
              <Select name="role" defaultValue="OPERATOR">
                {Object.entries(ROLE_LABELS)
                  .filter(([k]) => k !== "SUPER_ADMIN")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <Button type="submit" className="mt-4">
            Crear
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name || u.username}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      u.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {USER_STATUS_LABELS[u.status] || u.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="secondary" onClick={() => toggleStatus(u)}>
                    {u.status === "ACTIVE" ? "Deshabilitar" : "Activar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
