"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function NewBoilerPage() {
  const router = useRouter();
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
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
    const body = Object.fromEntries(form.entries());
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
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select id="type" name="type" required defaultValue="ACUOTUBULAR">
                <option value="TUBOS_HUMO">Tubos de humo</option>
                <option value="ACUOTUBULAR">Acuotubular</option>
                <option value="AGUA_CALIENTE">Agua caliente</option>
                <option value="ACEITE_TERMICO">Aceite térmico</option>
                <option value="OTRO">Otro</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="fuelType">Combustible *</Label>
              <Select id="fuelType" name="fuelType" required defaultValue="GAS_NATURAL">
                <option value="GAS_NATURAL">Gas natural</option>
                <option value="GAS_LP">Gas LP</option>
                <option value="DIESEL">Diésel</option>
                <option value="COMBUSTOLEO">Combustóleo</option>
                <option value="DUAL">Dual</option>
                <option value="OTRO">Otro</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacityHp">Capacidad (HP)</Label>
              <Input id="capacityHp" name="capacityHp" type="number" step="any" />
            </div>
            <div>
              <Label htmlFor="capacityKgH">Capacidad (kg/h)</Label>
              <Input id="capacityKgH" name="capacityKgH" type="number" step="any" />
            </div>
            <div>
              <Label htmlFor="designPressure">Presión de diseño</Label>
              <Input id="designPressure" name="designPressure" type="number" step="any" />
            </div>
            <div>
              <Label htmlFor="operatingPressure">Presión de operación</Label>
              <Input id="operatingPressure" name="operatingPressure" type="number" step="any" />
            </div>
            <div>
              <Label htmlFor="operatingTemperature">Temperatura de operación</Label>
              <Input id="operatingTemperature" name="operatingTemperature" type="number" step="any" />
            </div>
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
          <Button type="submit" disabled={loading}>
            Guardar caldera
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
