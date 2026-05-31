export function normalizePlantName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const PLANT_DUPLICATE_ERROR = "Planta o cliente existente";
