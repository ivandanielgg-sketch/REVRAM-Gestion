import { FuelConsumptionUnit, FuelPressureUnit, FuelType } from "@/generated/prisma/client";

export const OPERATING_FUEL_OPTIONS = [
  "GAS_NATURAL",
  "GAS_LP",
  "DIESEL",
  "COMBUSTOLEO",
  "BIOMASA",
  "OTRO",
] as const;

export type OperatingFuelType = (typeof OPERATING_FUEL_OPTIONS)[number];

const GAS_FUELS = new Set(["GAS_NATURAL", "GAS_LP"]);
const LIQUID_FUELS = new Set(["DIESEL", "COMBUSTOLEO"]);
const PRESSURE_KG_CM2_FUELS = new Set(["DIESEL", "COMBUSTOLEO", "BIOMASA", "OTRO"]);

export function resolveOperatingFuel(
  boilerFuelType: FuelType | string,
  operatingFuelType?: string | null
): string {
  if (boilerFuelType === "DUAL") {
    return operatingFuelType || "";
  }
  return boilerFuelType;
}

export function getFuelPressureUnit(fuel: string): FuelPressureUnit {
  if (GAS_FUELS.has(fuel)) return "IN_H2O";
  return "KG_CM2";
}

export function getFuelPressureUnitLabel(unit: FuelPressureUnit | string | null | undefined): string {
  if (unit === "IN_H2O") return "inH₂O";
  return "kg/cm²";
}

export function getDefaultFuelConsumptionUnit(fuel: string): FuelConsumptionUnit {
  if (GAS_FUELS.has(fuel)) return "M3N";
  if (LIQUID_FUELS.has(fuel)) return "L";
  if (fuel === "BIOMASA") return "KG";
  return "L";
}

export function getFuelConsumptionUnitLabel(unit: FuelConsumptionUnit | string | null | undefined): string {
  if (unit === "M3N") return "m³N";
  if (unit === "KG") return "kg";
  return "L";
}

export function allowsFuelConsumptionUnitSelection(fuel: string): boolean {
  return fuel === "OTRO";
}

export function formatPressureValue(
  value: number | null | undefined,
  notApplicable?: boolean,
  unit = "kg/cm²"
): string {
  if (notApplicable) return "No aplica";
  if (value == null) return "—";
  return `${value} ${unit}`;
}

export function formatBoilerTypeLabel(type: string, customType?: string | null): string {
  if (type === "OTRO" && customType) return customType;
  return type;
}

export function formatFuelTypeLabel(fuelType: string, customFuelType?: string | null): string {
  if (fuelType === "OTRO" && customFuelType) return customFuelType;
  return fuelType;
}

export function isGasFuel(fuel: string): boolean {
  return GAS_FUELS.has(fuel);
}

export function isLiquidFuel(fuel: string): boolean {
  return LIQUID_FUELS.has(fuel);
}

export function usesKgCm2FuelPressure(fuel: string): boolean {
  return PRESSURE_KG_CM2_FUELS.has(fuel);
}
