import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/session";
import { mergeCompanyLogWhere } from "@/lib/tenant-access";

export interface LogsFilterParams {
  startDate?: string | null;
  endDate?: string | null;
  boilerId?: string | null;
  operatorId?: string | null;
  shift?: string | null;
  status?: string | null;
  requiresMaintenance?: string | null;
  plantId?: string | null;
  fuelType?: string | null;
  boilerType?: string | null;
  search?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
}

export function buildLogsWhere(
  filters: LogsFilterParams,
  session?: SessionUser
): Prisma.BoilerLogWhereInput {
  const where: Prisma.BoilerLogWhereInput = session ? mergeCompanyLogWhere(session) : {};

  if (filters.startDate || filters.endDate) {
    where.logDate = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      where.logDate.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.logDate.lte = end;
    }
  }

  if (filters.boilerId) where.boilerId = filters.boilerId;
  if (filters.operatorId) where.operatorId = filters.operatorId;
  if (filters.shift) where.shift = filters.shift as Prisma.EnumShiftTypeFilter["equals"];
  if (filters.status) where.status = filters.status as Prisma.EnumLogStatusFilter["equals"];
  if (filters.requiresMaintenance === "true") where.requiresMaintenance = true;

  if (filters.search) {
    where.OR = [
      { generalObservations: { contains: filters.search, mode: "insensitive" } },
      { abnormalCondition: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.plantId || filters.fuelType || filters.boilerType) {
    where.boiler = {};
    if (filters.plantId) where.boiler.plantId = filters.plantId;
    if (filters.fuelType) where.boiler.fuelType = filters.fuelType as Prisma.EnumFuelTypeFilter["equals"];
    if (filters.boilerType) where.boiler.type = filters.boilerType as Prisma.EnumBoilerTypeFilter["equals"];
  }

  return where;
}

export function parseLogsFilters(searchParams: URLSearchParams): LogsFilterParams {
  return {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    boilerId: searchParams.get("boilerId"),
    operatorId: searchParams.get("operatorId"),
    shift: searchParams.get("shift"),
    status: searchParams.get("status"),
    requiresMaintenance: searchParams.get("requiresMaintenance"),
    plantId: searchParams.get("plantId"),
    fuelType: searchParams.get("fuelType"),
    boilerType: searchParams.get("boilerType"),
    search: searchParams.get("search"),
    sortBy: searchParams.get("sortBy"),
    sortOrder: searchParams.get("sortOrder"),
  };
}

export async function fetchFilteredLogs(
  filters: LogsFilterParams,
  forExport = false,
  session?: SessionUser
) {
  const sortBy = filters.sortBy || "logDate";
  const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
  const allowedSort = ["logDate", "status", "shift"];
  const orderField = allowedSort.includes(sortBy) ? sortBy : "logDate";

  return prisma.boilerLog.findMany({
    where: buildLogsWhere(filters, session),
    include: {
      boiler: { include: { plant: true } },
      operator: { select: { id: true, username: true } },
      combustion: true,
      waterTreatment: true,
      alerts: { select: { id: true, severity: true, parameter: true } },
    },
    orderBy: { [orderField]: sortOrder },
    take: forExport ? 5000 : 500,
  });
}
