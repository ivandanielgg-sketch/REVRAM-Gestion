"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, LoadingState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { BOILER_TYPE_LABELS, FUEL_TYPE_LABELS } from "@/lib/constants";
import { formatPressureValue } from "@/lib/units";

const LIMIT_FIELDS: [string, string][] = [
  ["pressureMinKgCm2", "Presión mínima (kg/cm²)"],
  ["pressureMaxKgCm2", "Presión máxima (kg/cm²)"],
  ["temperatureMinC", "Temperatura mínima (°C)"],
  ["temperatureMaxC", "Temperatura máxima (°C)"],
  ["waterLevelMinPercent", "Nivel de agua mínimo (%)"],
  ["conductivityMaxUsCm", "Conductividad máxima (μS/cm)"],
  ["phMin", "pH mínimo"],
  ["phMax", "pH máximo"],
  ["o2MinPercent", "O₂ mínimo (%)"],
  ["o2MaxPercent", "O₂ máximo (%)"],
  ["coMaxPpm", "CO máximo (ppm)"],
  ["stackTemperatureMaxC", "Temperatura máxima de gases (°C)"],
];

function NotApplicableField({
  label,
  name,
  naName,
  defaultValue,
  defaultNa,
}: {
  label: string;
  name: string;
  naName: string;
  defaultValue?: string;
  defaultNa?: boolean;
}) {
  const [na, setNa] = useState(defaultNa ?? false);
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type="number" step="any" defaultValue={defaultValue} disabled={na} />
      <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" name={naName} value="true" checked={na} onChange={(e) => setNa(e.target.checked)} />
        No aplica
      </label>
    </div>
  );
}

export default function EditBoilerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [boiler, setBoiler] = useState<Record<string, unknown> | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch(`/api/boilers/${id}`).then((r) => r.json()), fetch("/api/plants").then((r) => r.json())]).then(
      ([b, p]) => {
        setBoiler(b);
        setType(b.type as string);
        setFuelType(b.fuelType as string);
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
    const body: Record<string, unknown> = Object.fromEntries(form.entries());
    for (const key of ["designPressureNotApplicable", "operatingPressureNotApplicable", "operatingTemperatureNotApplicable"]) {
      body[key] = form.get(key) === "true";
    }
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
              <div><Label>ID interno</Label><Input name="internalId" defaultValue={boiler.internalId as string} required /></div>
              <div><Label>Nombre</Label><Input name="name" defaultValue={boiler.name as string} required /></div>
              <div><Label>Marca</Label><Input name="brand" defaultValue={(boiler.brand as string) || ""} /></div>
              <div><Label>Modelo</Label><Input name="model" defaultValue={(boiler.model as string) || ""} /></div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.entries(BOILER_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </div>
              {type === "OTRO" && (
                <div>
                  <Label>Especificar tipo de equipo *</Label>
                  <Input name="customType" defaultValue={(boiler.customType as string) || ""} required />
                </div>
              )}
              <div>
                <Label>Tipo de combustible</Label>
                <Select name="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </div>
              {fuelType === "OTRO" && (
                <div>
                  <Label>Especificar combustible *</Label>
                  <Input name="customFuelType" defaultValue={(boiler.customFuelType as string) || ""} required />
                </div>
              )}
              <div>
                <Label>Planta</Label>
                <Select name="plantId" defaultValue={(boiler.plantId as string) || ""}>
                  <option value="">—</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <NotApplicableField
                label="Presión de diseño (kg/cm²)"
                name="designPressureKgCm2"
                naName="designPressureNotApplicable"
                defaultValue={boiler.designPressureKgCm2 != null ? String(boiler.designPressureKgCm2) : ""}
                defaultNa={Boolean(boiler.designPressureNotApplicable)}
              />
              <NotApplicableField
                label="Presión de operación (kg/cm²)"
                name="operatingPressureKgCm2"
                naName="operatingPressureNotApplicable"
                defaultValue={boiler.operatingPressureKgCm2 != null ? String(boiler.operatingPressureKgCm2) : ""}
                defaultNa={Boolean(boiler.operatingPressureNotApplicable)}
              />
              <NotApplicableField
                label="Temperatura de operación (°C)"
                name="operatingTemperatureC"
                naName="operatingTemperatureNotApplicable"
                defaultValue={boiler.operatingTemperatureC != null ? String(boiler.operatingTemperatureC) : ""}
                defaultNa={Boolean(boiler.operatingTemperatureNotApplicable)}
              />
              <div>
                <Label>Estatus</Label>
                <Select name="status" defaultValue={boiler.status as string}>
                  <option value="OPERANDO">Operando</option>
                  <option value="FUERA_SERVICIO">Fuera de servicio</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="STANDBY">Standby</option>
                </Select>
              </div>
              <div className="sm:col-span-2 text-xs text-slate-500">
                Diseño: {formatPressureValue(boiler.designPressureKgCm2 as number | null, Boolean(boiler.designPressureNotApplicable))} ·
                Operación: {formatPressureValue(boiler.operatingPressureKgCm2 as number | null, Boolean(boiler.operatingPressureNotApplicable))} ·
                Temp: {formatPressureValue(boiler.operatingTemperatureC as number | null, Boolean(boiler.operatingTemperatureNotApplicable), "°C")}
              </div>
              <div className="sm:col-span-2">
                <Label>Notas técnicas</Label>
                <Textarea name="technicalNotes" defaultValue={(boiler.technicalNotes as string) || ""} rows={3} />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-4" disabled={loading}>Guardar</Button>
          </Card>
        </form>

        <form onSubmit={saveLimits}>
          <Card title="Límites operativos">
            <p className="mb-4 text-xs text-slate-500">Estos límites se usan para generar alertas automáticas. Campos vacíos no generan alertas.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {LIMIT_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input name={key} type="number" step="any" defaultValue={limits[key] || ""} />
                </div>
              ))}
            </div>
            <Button type="submit" className="mt-4" disabled={loading}>Guardar límites</Button>
          </Card>
        </form>
      </div>
      <Button variant="secondary" className="mt-4" onClick={() => router.push("/boilers")}>Volver</Button>
    </div>
  );
}
