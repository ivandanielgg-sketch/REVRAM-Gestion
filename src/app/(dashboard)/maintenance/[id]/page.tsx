"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/maintenance/${id}`).then((r) => r.json()).then(setOrder);
  }, [id]);

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/maintenance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const data = await res.json();
    if (res.ok) setOrder(data);
  }

  if (!order) return <LoadingState />;

  return (
    <div>
      <PageHeader title={`Orden ${order.orderNumber as string}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Información">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Caldera</dt><dd>{(order.boiler as { name: string }).name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tipo</dt><dd>{order.type as string}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Prioridad</dt><dd>{order.priority as string}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Estado</dt><dd>{order.status as string}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Creada</dt><dd>{formatDate(order.createdAt as string, true)}</dd></div>
          </dl>
          <p className="mt-4 text-sm">{order.description as string}</p>
        </Card>

        <form onSubmit={update}>
          <Card title="Actualizar orden">
            <div className="space-y-4">
              <div>
                <Label>Estado</Label>
                <Select name="status" defaultValue={order.status as string}>
                  <option value="ABIERTA">Abierta</option>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="CERRADA">Cerrada</option>
                  <option value="CANCELADA">Cancelada</option>
                </Select>
              </div>
              <div>
                <Label>Hallazgo</Label>
                <Textarea name="finding" defaultValue={(order.finding as string) || ""} rows={2} />
              </div>
              <div>
                <Label>Acción realizada</Label>
                <Textarea name="actionTaken" defaultValue={(order.actionTaken as string) || ""} rows={2} />
              </div>
              <div>
                <Label>Refacciones utilizadas</Label>
                <Textarea name="partsUsed" defaultValue={(order.partsUsed as string) || ""} rows={2} />
              </div>
            </div>
            <Button type="submit" className="mt-4">Guardar</Button>
          </Card>
        </form>
      </div>
      <Button variant="secondary" className="mt-4" onClick={() => router.push("/maintenance")}>
        Volver
      </Button>
    </div>
  );
}
