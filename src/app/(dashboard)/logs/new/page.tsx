"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SAFETY_CHECKLIST_ITEMS } from "@/lib/constants";

interface ChecklistItem {
  itemKey: string;
  itemLabel: string;
  response: "CUMPLE" | "NO_CUMPLE" | "NO_APLICA";
  observation: string;
}

export default function NewLogPage() {
  const router = useRouter();
  const [boilers, setBoilers] = useState<{ id: string; name: string }[]>([]);
  const [operators, setOperators] = useState<{ id: string; username: string }[]>([]);
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    SAFETY_CHECKLIST_ITEMS.map((i) => ({
      itemKey: i.key,
      itemLabel: i.label,
      response: "CUMPLE",
      observation: "",
    }))
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/boilers").then((r) => r.json()),
      fetch("/api/users/operators").then((r) => r.json()).catch(() => []),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([b, u, s]) => {
      setBoilers(b);
      setOperators(u.filter((x: { role: string }) => ["OPERADOR", "SUPERVISOR", "ADMINISTRADOR"].includes(x.role)));
      setSession(s.user);
    });
  }, []);

  async function submit(status: string) {
    setLoading(true);
    setError("");
    const form = document.getElementById("log-form") as HTMLFormElement;
    const fd = new FormData(form);
    const num = (k: string) => {
      const v = fd.get(k);
      return v === "" || v === null ? null : Number(v);
    };

    const body = {
      boilerId: fd.get("boilerId"),
      operatorId: fd.get("operatorId"),
      shift: fd.get("shift"),
      customShift: fd.get("customShift") || undefined,
      accumulatedHours: num("accumulatedHours"),
      loadLevel: fd.get("loadLevel") || null,
      loadPercentage: num("loadPercentage"),
      operationalState: fd.get("operationalState"),
      steamPressure: num("steamPressure"),
      steamTemperature: num("steamTemperature"),
      feedwaterPressure: num("feedwaterPressure"),
      feedwaterTemperature: num("feedwaterTemperature"),
      condensateReturnTemp: num("condensateReturnTemp"),
      waterLevel: num("waterLevel"),
      feedPumpStatus: fd.get("feedPumpStatus") || undefined,
      alternatePumpStatus: fd.get("alternatePumpStatus") || undefined,
      fuelPressure: num("fuelPressure"),
      airPressure: num("airPressure"),
      fanFrequency: num("fanFrequency"),
      modulationPosition: num("modulationPosition"),
      generalObservations: fd.get("generalObservations") || undefined,
      abnormalCondition: fd.get("abnormalCondition") || undefined,
      immediateCorrectiveAction: fd.get("immediateCorrectiveAction") || undefined,
      requiresMaintenance: fd.get("requiresMaintenance") === "on",
      maintenancePriority: fd.get("maintenancePriority") || null,
      operatorSignature: fd.get("operatorSignature") || undefined,
      status,
      combustion: {
        flueGasTemperature: num("flueGasTemperature"),
        o2: num("o2"),
        co: num("co"),
        co2: num("co2"),
        excessAir: num("excessAir"),
        estimatedEfficiency: num("estimatedEfficiency"),
        fuelConsumption: num("fuelConsumption"),
        steamFlow: num("steamFlow"),
      },
      waterTreatment: {
        ph: num("ph"),
        conductivity: num("conductivity"),
        tds: num("tds"),
        hardness: num("hardness"),
        sulfites: num("sulfites"),
        phosphates: num("phosphates"),
        alkalinity: num("alkalinity"),
        chlorides: num("chlorides"),
        bottomBlowdownDone: fd.get("bottomBlowdownDone") === "on",
        surfaceBlowdownDone: fd.get("surfaceBlowdownDone") === "on",
        softenerInService: fd.get("softenerInService") === "on",
        regenerationDone: fd.get("regenerationDone") === "on",
        observations: fd.get("waterObservations") || undefined,
      },
      safetyChecklist: checklist,
    };

    const res = await fetch("/api/logs", {
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
    router.push(`/logs/${data.id}`);
  }

  function updateChecklist(index: number, field: keyof ChecklistItem, value: string) {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  return (
    <div>
      <PageHeader title="Nueva bitácora" description="Registro de operación de caldera" />
      <form id="log-form" className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Card title="Datos generales">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Caldera *</Label>
              <Select name="boilerId" required>
                <option value="">— Seleccionar —</option>
                {boilers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Operador *</Label>
              <Select name="operatorId" required defaultValue={session?.id || ""}>
                <option value="">— Seleccionar —</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.username}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Turno *</Label>
              <Select name="shift" required defaultValue="MATUTINO">
                <option value="MATUTINO">Matutino</option>
                <option value="VESPERTINO">Vespertino</option>
                <option value="NOCTURNO">Nocturno</option>
                <option value="PERSONALIZADO">Personalizado</option>
              </Select>
            </div>
            <div>
              <Label>Turno personalizado</Label>
              <Input name="customShift" />
            </div>
            <div>
              <Label>Horas acumuladas</Label>
              <Input name="accumulatedHours" type="number" step="any" />
            </div>
            <div>
              <Label>Carga estimada</Label>
              <Select name="loadLevel">
                <option value="">—</option>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="PORCENTAJE_MANUAL">Porcentaje manual</option>
              </Select>
            </div>
            <div>
              <Label>% carga manual</Label>
              <Input name="loadPercentage" type="number" step="any" min={0} max={100} />
            </div>
            <div>
              <Label>Estado operativo</Label>
              <Select name="operationalState" defaultValue="NORMAL">
                <option value="NORMAL">Normal</option>
                <option value="OBSERVACION">Observación</option>
                <option value="ALARMA">Alarma</option>
                <option value="FUERA_SERVICIO">Fuera de servicio</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card title="Parámetros de operación">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["steamPressure", "Presión vapor"],
              ["steamTemperature", "Temp. vapor"],
              ["feedwaterPressure", "Presión agua alimentación"],
              ["feedwaterTemperature", "Temp. agua alimentación"],
              ["condensateReturnTemp", "Temp. retorno condensados"],
              ["waterLevel", "Nivel de agua *"],
              ["fuelPressure", "Presión combustible"],
              ["airPressure", "Presión aire"],
              ["fanFrequency", "Frecuencia ventilador/VFD"],
              ["modulationPosition", "Posición modulación"],
              ["flueGasTemperature", "Temp. gases chimenea"],
              ["o2", "O2 (%)"],
              ["co", "CO (ppm)"],
              ["co2", "CO2 (%)"],
              ["excessAir", "Exceso de aire"],
              ["estimatedEfficiency", "Eficiencia estimada"],
              ["fuelConsumption", "Consumo combustible"],
              ["steamFlow", "Flujo de vapor"],
            ].map(([name, label]) => (
              <div key={name}>
                <Label>{label}</Label>
                <Input name={name} type="number" step="any" />
              </div>
            ))}
            <div>
              <Label>Bomba alimentación</Label>
              <Input name="feedPumpStatus" />
            </div>
            <div>
              <Label>Bomba alterna</Label>
              <Input name="alternatePumpStatus" />
            </div>
          </div>
        </Card>

        <Card title="Tratamiento de agua">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ph", "pH"],
              ["conductivity", "Conductividad"],
              ["tds", "TDS"],
              ["hardness", "Dureza"],
              ["sulfites", "Sulfitos"],
              ["phosphates", "Fosfatos"],
              ["alkalinity", "Alcalinidad"],
              ["chlorides", "Cloruros"],
            ].map(([name, label]) => (
              <div key={name}>
                <Label>{label}</Label>
                <Input name={name} type="number" step="any" />
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:col-span-2">
              {[
                ["bottomBlowdownDone", "Purga de fondo"],
                ["surfaceBlowdownDone", "Purga de superficie"],
                ["softenerInService", "Suavizador en servicio"],
                ["regenerationDone", "Regeneración realizada"],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={name} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <div className="sm:col-span-2">
              <Label>Observaciones tratamiento</Label>
              <Textarea name="waterObservations" rows={2} />
            </div>
          </div>
        </Card>

        <Card title="Seguridad y pruebas operativas">
          <div className="space-y-3">
            {checklist.map((item, i) => (
              <div key={item.itemKey} className="grid gap-2 rounded border border-slate-100 p-3 sm:grid-cols-3">
                <p className="text-sm font-medium text-slate-700">{item.itemLabel}</p>
                <Select
                  value={item.response}
                  onChange={(e) => updateChecklist(i, "response", e.target.value)}
                >
                  <option value="CUMPLE">Cumple</option>
                  <option value="NO_CUMPLE">No cumple</option>
                  <option value="NO_APLICA">No aplica</option>
                </Select>
                <Input
                  placeholder="Observación"
                  value={item.observation}
                  onChange={(e) => updateChecklist(i, "observation", e.target.value)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Eventos y observaciones">
          <div className="grid gap-4">
            <div>
              <Label>Observaciones generales</Label>
              <Textarea name="generalObservations" rows={2} />
            </div>
            <div>
              <Label>Condición anormal</Label>
              <Textarea name="abnormalCondition" rows={2} />
            </div>
            <div>
              <Label>Acción correctiva inmediata</Label>
              <Textarea name="immediateCorrectiveAction" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requiresMaintenance" className="rounded" />
                Requiere mantenimiento
              </label>
              <div>
                <Label>Prioridad</Label>
                <Select name="maintenancePriority">
                  <option value="">—</option>
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </Select>
              </div>
              <div>
                <Label>Firma / confirmación operador</Label>
                <Input name="operatorSignature" placeholder="Nombre o ID" />
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => submit("BORRADOR")}>
            Guardar borrador
          </Button>
          <Button type="button" disabled={loading} onClick={() => submit("ENVIADO")}>
            Enviar para revisión
          </Button>
        </div>
      </form>
    </div>
  );
}
