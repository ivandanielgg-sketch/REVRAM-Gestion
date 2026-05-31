"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { displayBoilerType, displayFuelType, STATUS_COLORS } from "@/lib/constants";

interface Boiler {
  id: string;
  internalId: string;
  name: string;
  brand: string | null;
  type: string;
  customType?: string | null;
  fuelType: string;
  customFuelType?: string | null;
  status: string;
  plant: { name: string; client: string | null } | null;
}

export default function BoilersPage() {
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/boilers")
      .then((r) => r.json())
      .then((data) => {
        setBoilers(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Catálogo de calderas"
        description="Registro y consulta de calderas industriales"
        action={
          <Link href="/boilers/new">
            <Button>Nueva caldera</Button>
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Combustible</th>
              <th className="px-4 py-3">Planta</th>
              <th className="px-4 py-3">Estatus</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {boilers.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{b.internalId}</td>
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.brand || "—"}</td>
                <td className="px-4 py-3">{displayBoilerType(b.type, b.customType)}</td>
                <td className="px-4 py-3">{displayFuelType(b.fuelType, b.customFuelType)}</td>
                <td className="px-4 py-3">{b.plant?.name || "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_COLORS[b.status]}>
                    {b.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/boilers/${b.id}`} className="text-slate-600 hover:text-slate-900">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
