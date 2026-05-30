"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string;
  boiler: { name: string };
  responsible: { username: string } | null;
}

export default function MaintenancePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [boilers, setBoilers] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/boilers").then((r) => r.json()).then(setBoilers);
    load();
  }, []);

  async function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Mantenimiento"
        description="Órdenes de mantenimiento preventivo y correctivo"
        action={<Button onClick={() => setShowForm(!showForm)}>Nueva orden</Button>}
      />

      {showForm && (
        <form onSubmit={createOrder} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Caldera *</Label>
              <Select name="boilerId" required>
                <option value="">—</option>
                {boilers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select name="type" defaultValue="PREVENTIVO">
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
                <option value="PREDICTIVO">Predictivo</option>
                <option value="INSPECCION">Inspección</option>
              </Select>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select name="priority" defaultValue="MEDIA">
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </Select>
            </div>
            <div>
              <Label>Fecha programada</Label>
              <Input name="scheduledDate" type="date" />
            </div>
            <div className="sm:col-span-2">
              <Label>Descripción *</Label>
              <Textarea name="description" required rows={2} />
            </div>
          </div>
          <Button type="submit" className="mt-4">Crear orden</Button>
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Caldera</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.boiler.name}</td>
                  <td className="px-4 py-3">{o.type}</td>
                  <td className="px-4 py-3">
                    <Badge className={o.priority === "CRITICA" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}>
                      {o.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{o.status.replace("_", " ")}</td>
                  <td className="px-4 py-3">{formatDate(o.createdAt, true)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/maintenance/${o.id}`} className="text-slate-600 hover:text-slate-900">
                      Ver
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
