"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function EditBoilerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [boiler, setBoiler] = useState<Record<string, unknown> | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch(`/api/boilers/${id}`).then((r) => r.json()), fetch("/api/plants").then((r) => r.json())]).then(
      ([b, p]) => {
        setBoiler(b);
        setPlants(p);
        if (b.operatingLimits) {
          const l: Record<string, string> = {};
          for (const [k, v] of Object.entries(b.operatingLimits)) {
            if (typeof v === "number") l[k] = String(v);
          }
          setLimits(l);
        }
      }
    );
  }, [id]);

  async function saveBoiler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`/api/boilers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setBoiler(data);
    setLoading(false);
  }

  async function saveLimits(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`/api/boilers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    setLoading(false);
  }

  if (!boiler) return <LoadingState />;

  return (
    <div>
      <PageHeader title={`Editar: ${boiler.name as string}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveBoiler}>
          <Card title="Datos de caldera">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>ID interno</Label>
                <Input name="internalId" defaultValue={boiler.internalId as string} required />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input name="name" defaultValue={boiler.name as string} required />
              </div>
              <div>
                <Label>Marca</Label>
                <Input name="brand" defaultValue={(boiler.brand as string) || ""} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input name="model" defaultValue={(boiler.model as string) || ""} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" defaultValue={boiler.type as string}>
                  <option value="TUBOS_HUMO">Tubos de humo</option>
                  <option value="ACUOTUBULAR">Acuotubular</option>
                  <option value="AGUA_CALIENTE">Agua caliente</option>
                  <option value="ACEITE_TERMICO">Aceite térmico</option>
                  <option value="OTRO">Otro</option>
                </Select>
              </div>
              <div>
                <Label>Combustible</Label>
                <Select name="fuelType" defaultValue={boiler.fuelType as string}>
                  <option value="GAS_NATURAL">Gas natural</option>
                  <option value="GAS_LP">Gas LP</option>
                  <option value="DIESEL">Diésel</option>
                  <option value="COMBUSTOLEO">Combustóleo</option>
                  <option value="DUAL">Dual</option>
                  <option value="OTRO">Otro</option>
                </Select>
              </div>
              <div>
                <Label>Planta</Label>
                <Select name="plantId" defaultValue={(boiler.plantId as string) || ""}>
                  <option value="">—</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Estatus</Label>
                <Select name="status" defaultValue={boiler.status as string}>
                  <option value="OPERANDO">Operando</option>
                  <option value="FUERA_SERVICIO">Fuera de servicio</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="STANDBY">Standby</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Notas técnicas</Label>
                <Textarea name="technicalNotes" defaultValue={(boiler.technicalNotes as string) || ""} rows={3} />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-4" disabled={loading}>
              Guardar
            </Button>
          </Card>
        </form>

        <form onSubmit={saveLimits}>
          <Card title="Límites operativos">
            <p className="mb-4 text-xs text-slate-500">
              Estos límites se usan para generar alertas automáticas.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["pressureMin", "Presión mínima"],
                ["pressureMax", "Presión máxima"],
                ["temperatureMin", "Temp. mínima"],
                ["temperatureMax", "Temp. máxima"],
                ["waterLevelMin", "Nivel agua mín."],
                ["conductivityMax", "Conductividad máx."],
                ["phMin", "pH mínimo"],
                ["phMax", "pH máximo"],
                ["o2Min", "O2 mínimo"],
                ["o2Max", "O2 máximo"],
                ["coMax", "CO máximo"],
                ["flueGasTempMax", "Temp. gases máx."],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input name={key} type="number" step="any" defaultValue={limits[key] || ""} />
                </div>
              ))}
            </div>
            <Button type="submit" className="mt-4" disabled={loading}>
              Guardar límites
            </Button>
          </Card>
        </form>
      </div>
      <Button variant="secondary" className="mt-4" onClick={() => router.push("/boilers")}>
        Volver
      </Button>
    </div>
  );
}
