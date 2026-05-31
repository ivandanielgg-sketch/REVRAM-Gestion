"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SAFETY_CHECKLIST_ITEMS, OPERATING_FUEL_LABELS } from "@/lib/constants";
import {
  allowsFuelConsumptionUnitSelection,
  getDefaultFuelConsumptionUnit,
  getFuelConsumptionUnitLabel,
  getFuelPressureUnit,
  getFuelPressureUnitLabel,
  resolveOperatingFuel,
} from "@/lib/units";

interface BoilerOption {
  id: string;
  name: string;
  fuelType: string;
}

interface ChecklistItem {
  itemKey: string;
  itemLabel: string;
  response: "CUMPLE" | "NO_CUMPLE" | "NO_APLICA";
  observation: string;
}

export default function NewLogPage() {
  const router = useRouter();
  const [boilers, setBoilers] = useState<BoilerOption[]>([]);
  const [operators, setOperators] = useState<{ id: string; username: string; role: string }[]>([]);
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [selectedBoilerId, setSelectedBoilerId] = useState("");
  const [operatingFuelType, setOperatingFuelType] = useState("");
  const [fuelConsumptionUnit, setFuelConsumptionUnit] = useState<string>("");
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

  const selectedBoiler = useMemo(
    () => boilers.find((b) => b.id === selectedBoilerId),
    [boilers, selectedBoilerId]
  );

  const effectiveFuel = useMemo(() => {
    if (!selectedBoiler) return "";
    return resolveOperatingFuel(selectedBoiler.fuelType, operatingFuelType);
  }, [selectedBoiler, operatingFuelType]);

  const fuelPressureUnit = effectiveFuel ? getFuelPressureUnit(effectiveFuel) : "KG_CM2";
  const fuelPressureLabel = `Presión de combustible (${getFuelPressureUnitLabel(fuelPressureUnit)})`;
  const defaultConsumptionUnit = effectiveFuel ? getDefaultFuelConsumptionUnit(effectiveFuel) : "L";
  const consumptionUnit = fuelConsumptionUnit || defaultConsumptionUnit;
  const fuelConsumptionLabel = `Consumo de combustible (${getFuelConsumptionUnitLabel(consumptionUnit)})`;

  useEffect(() => {
    Promise.all([
      fetch("/api/boilers").then((r) => r.json()),
      fetch("/api/users/operators").then((r) => r.json()).catch(() => []),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([b, u, s]) => {
      setBoilers(b);
      setOperators(u.filter((x: { role: string }) => ["OPERATOR", "SUPERVISOR", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(x.role)));
      setSession(s.user);
    });
  }, []);

  useEffect(() => {
    if (effectiveFuel && effectiveFuel !== "OTRO") {
      setFuelConsumptionUnit(getDefaultFuelConsumptionUnit(effectiveFuel));
    }
  }, [effectiveFuel]);

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
      steamPressureKgCm2: num("steamPressureKgCm2"),
      steamTemperatureC: num("steamTemperatureC"),
      feedwaterPressureKgCm2: num("feedwaterPressureKgCm2"),
      feedwaterTemperatureC: num("feedwaterTemperatureC"),
      condensateReturnTemperatureC: num("condensateReturnTemperatureC"),
      waterLevelPercent: num("waterLevelPercent"),
      feedPumpStatus: fd.get("feedPumpStatus") || undefined,
      alternatePumpStatus: fd.get("alternatePumpStatus") || undefined,
      feedPumpPressureKgCm2: num("feedPumpPressureKgCm2"),
      alternatePumpPressureKgCm2: num("alternatePumpPressureKgCm2"),
      fuelPressureValue: num("fuelPressureValue"),
      fuelPressureUnit: effectiveFuel ? getFuelPressureUnit(effectiveFuel) : null,
      operatingFuelType: selectedBoiler?.fuelType === "DUAL" ? operatingFuelType : null,
      fuelConsumptionValue: num("fuelConsumptionValue"),
      fuelConsumptionUnit: consumptionUnit || null,
      boilerFuelType: selectedBoiler?.fuelType,
      airPressure: num("airPressure"),
      fanFrequencyHz: num("fanFrequencyHz"),
      modulationPositionDegrees: num("modulationPositionDegrees"),
      generalObservations: fd.get("generalObservations") || undefined,
      abnormalCondition: fd.get("abnormalCondition") || undefined,
      immediateCorrectiveAction: fd.get("immediateCorrectiveAction") || undefined,
      requiresMaintenance: fd.get("requiresMaintenance") === "on",
      maintenancePriority: fd.get("maintenancePriority") || null,
      operatorSignature: fd.get("operatorSignature") || undefined,
      status,
      combustion: {
        flueGasTemperatureC: num("flueGasTemperatureC"),
        o2Percent: num("o2Percent"),
        coPpm: num("coPpm"),
        co2Percent: num("co2Percent"),
        excessAirPercent: num("excessAirPercent"),
        estimatedEfficiencyPercent: num("estimatedEfficiencyPercent"),
        steamFlowKgH: num("steamFlowKgH"),
      },
      waterTreatment: {
        ph: num("ph"),
        conductivityUsCm: num("conductivityUsCm"),
        tdsPpm: num("tdsPpm"),
        hardnessPpmAsCaCO3: num("hardnessPpmAsCaCO3"),
        sulfitesPpm: num("sulfitesPpm"),
        phosphatesPpm: num("phosphatesPpm"),
        alkalinityPpmAsCaCO3: num("alkalinityPpmAsCaCO3"),
        chloridesPpm: num("chloridesPpm"),
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
              <Select name="boilerId" required value={selectedBoilerId} onChange={(e) => setSelectedBoilerId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {boilers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            {selectedBoiler?.fuelType === "DUAL" && (
              <div>
                <Label>Combustible en operación *</Label>
                <Select value={operatingFuelType} onChange={(e) => setOperatingFuelType(e.target.value)} required>
                  <option value="">— Seleccionar —</option>
                  {Object.entries(OPERATING_FUEL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </div>
            )}
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
            <div><Label>Turno personalizado</Label><Input name="customShift" /></div>
            <div><Label>Horas acumuladas</Label><Input name="accumulatedHours" type="number" step="any" /></div>
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
            <div><Label>% carga manual</Label><Input name="loadPercentage" type="number" step="any" min={0} max={100} /></div>
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
              ["steamPressureKgCm2", "Presión de vapor (kg/cm²)"],
              ["steamTemperatureC", "Temperatura de vapor (°C)"],
              ["feedwaterPressureKgCm2", "Presión de agua de alimentación (kg/cm²)"],
              ["feedwaterTemperatureC", "Temperatura de agua de alimentación (°C)"],
              ["condensateReturnTemperatureC", "Temperatura de retorno de condensados (°C)"],
              ["waterLevelPercent", "Nivel de agua (%) *"],
              ["airPressure", "Presión aire"],
              ["fanFrequencyHz", "Frecuencia de ventilador/VFD (Hz)"],
              ["modulationPositionDegrees", "Posición de modulación (°)"],
              ["flueGasTemperatureC", "Temperatura de gases de chimenea (°C)"],
              ["o2Percent", "O₂ (%)"],
              ["coPpm", "CO (ppm)"],
              ["co2Percent", "CO₂ (%)"],
              ["excessAirPercent", "Exceso de aire (%)"],
              ["estimatedEfficiencyPercent", "Eficiencia estimada (%)"],
              ["steamFlowKgH", "Flujo de vapor (kg/h)"],
            ].map(([name, label]) => (
              <div key={name}>
                <Label>{label}</Label>
                <Input name={name} type="number" step="any" />
              </div>
            ))}
            <div>
              <Label>{fuelPressureLabel}</Label>
              <Input name="fuelPressureValue" type="number" step="any" />
            </div>
            <div>
              <Label>{fuelConsumptionLabel}</Label>
              <Input name="fuelConsumptionValue" type="number" step="any" />
              {effectiveFuel && allowsFuelConsumptionUnitSelection(effectiveFuel) && (
                <Select
                  className="mt-1"
                  value={fuelConsumptionUnit}
                  onChange={(e) => setFuelConsumptionUnit(e.target.value)}
                >
                  <option value="M3N">m³N</option>
                  <option value="L">L</option>
                  <option value="KG">kg</option>
                </Select>
              )}
            </div>
            <div>
              <Label>Estado bomba de alimentación</Label>
              <Input name="feedPumpStatus" />
            </div>
            <div>
              <Label>Presión de bomba de alimentación (kg/cm²)</Label>
              <Input name="feedPumpPressureKgCm2" type="number" step="any" />
            </div>
            <div>
              <Label>Estado bomba alterna</Label>
              <Input name="alternatePumpStatus" />
            </div>
            <div>
              <Label>Presión de bomba alterna (kg/cm²)</Label>
              <Input name="alternatePumpPressureKgCm2" type="number" step="any" />
            </div>
          </div>
        </Card>

        <Card title="Tratamiento de agua">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ph", "pH"],
              ["conductivityUsCm", "Conductividad (μS/cm)"],
              ["tdsPpm", "TDS (ppm)"],
              ["hardnessPpmAsCaCO3", "Dureza total (ppm como CaCO₃)"],
              ["sulfitesPpm", "Sulfitos (ppm)"],
              ["phosphatesPpm", "Fosfatos (ppm)"],
              ["alkalinityPpmAsCaCO3", "Alcalinidad (ppm como CaCO₃)"],
              ["chloridesPpm", "Cloruros (ppm)"],
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
                <Select value={item.response} onChange={(e) => updateChecklist(i, "response", e.target.value)}>
                  <option value="CUMPLE">Cumple</option>
                  <option value="NO_CUMPLE">No cumple</option>
                  <option value="NO_APLICA">No aplica</option>
                </Select>
                <Input placeholder="Observación" value={item.observation} onChange={(e) => updateChecklist(i, "observation", e.target.value)} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Eventos y observaciones">
          <div className="grid gap-4">
            <div><Label>Observaciones generales</Label><Textarea name="generalObservations" rows={2} /></div>
            <div><Label>Condición anormal</Label><Textarea name="abnormalCondition" rows={2} /></div>
            <div><Label>Acción correctiva inmediata</Label><Textarea name="immediateCorrectiveAction" rows={2} /></div>
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
