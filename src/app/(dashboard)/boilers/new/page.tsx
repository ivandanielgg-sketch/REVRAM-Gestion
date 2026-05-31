"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { BOILER_TYPE_LABELS, FUEL_TYPE_LABELS } from "@/lib/constants";

function NotApplicableField({
  label,
  name,
  naName,
  defaultNa = false,
}: {
  label: string;
  name: string;
  naName: string;
  defaultNa?: boolean;
}) {
  const [na, setNa] = useState(defaultNa);
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step="any" disabled={na} />
      <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          name={naName}
          value="true"
          checked={na}
          onChange={(e) => setNa(e.target.checked)}
        />
        No aplica
      </label>
    </div>
  );
}

export default function NewBoilerPage() {
  const router = useRouter();
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState("ACUOTUBULAR");
  const [fuelType, setFuelType] = useState("GAS_NATURAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/plants")
      .then((r) => r.json())
      .then(setPlants);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(form.entries());
    for (const key of ["designPressureNotApplicable", "operatingPressureNotApplicable", "operatingTemperatureNotApplicable"]) {
      body[key] = form.get(key) === "true";
    }
    const res = await fetch("/api/boilers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    router.push(`/boilers/${data.id}`);
  }

  return (
    <div>
      <PageHeader title="Nueva caldera" description="Registrar caldera industrial" />
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card title="Datos generales">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="internalId">ID interno *</Label>
              <Input id="internalId" name="internalId" required />
            </div>
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" name="brand" />
            </div>
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" />
            </div>
            <div>
              <Label htmlFor="serialNumber">Número de serie</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
            <div>
              <Label htmlFor="plantId">Planta</Label>
              <Select id="plantId" name="plantId">
                <option value="">— Seleccionar —</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select id="type" name="type" required value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(BOILER_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>
            {type === "OTRO" && (
              <div>
                <Label htmlFor="customType">Especificar tipo de equipo *</Label>
                <Input id="customType" name="customType" required />
              </div>
            )}
            <div>
              <Label htmlFor="fuelType">Tipo de combustible *</Label>
              <Select id="fuelType" name="fuelType" required value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>
            {fuelType === "OTRO" && (
              <div>
                <Label htmlFor="customFuelType">Especificar combustible *</Label>
                <Input id="customFuelType" name="customFuelType" required />
              </div>
            )}
            <div>
              <Label htmlFor="capacityHp">Capacidad (HP)</Label>
              <Input id="capacityHp" name="capacityHp" type="number" step="any" />
            </div>
            <div>
              <Label htmlFor="capacityKgH">Capacidad (kg/h)</Label>
              <Input id="capacityKgH" name="capacityKgH" type="number" step="any" />
            </div>
            <NotApplicableField label="Presión de diseño (kg/cm²)" name="designPressureKgCm2" naName="designPressureNotApplicable" />
            <NotApplicableField label="Presión de operación (kg/cm²)" name="operatingPressureKgCm2" naName="operatingPressureNotApplicable" />
            <NotApplicableField label="Temperatura de operación (°C)" name="operatingTemperatureC" naName="operatingTemperatureNotApplicable" />
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" name="location" />
            </div>
            <div>
              <Label htmlFor="status">Estatus *</Label>
              <Select id="status" name="status" defaultValue="OPERANDO">
                <option value="OPERANDO">Operando</option>
                <option value="FUERA_SERVICIO">Fuera de servicio</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="STANDBY">Standby</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="technicalNotes">Notas técnicas</Label>
              <Textarea id="technicalNotes" name="technicalNotes" rows={3} />
            </div>
          </div>
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar caldera"}</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
