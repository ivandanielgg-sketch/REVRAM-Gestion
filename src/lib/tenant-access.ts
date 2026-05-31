import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { assertCompanyAccess, companyFilter } from "@/lib/tenant";

export async function getBoilerForSession(boilerId: string, session: SessionUser) {
  const boiler = await prisma.boiler.findUnique({
    where: { id: boilerId },
    include: { plant: true, operatingLimits: true, company: true },
  });
  if (!boiler) return null;
  if (!assertCompanyAccess(session, boiler.companyId)) return null;
  return boiler;
}

export async function getLogForSession(logId: string, session: SessionUser) {
  const log = await prisma.boilerLog.findUnique({
    where: { id: logId },
    include: { boiler: { select: { companyId: true } } },
  });
  if (!log) return null;
  if (!assertCompanyAccess(session, log.boiler.companyId)) return null;
  return log;
}

export async function getAlertForSession(alertId: string, session: SessionUser) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { boiler: { select: { companyId: true } } },
  });
  if (!alert) return null;
  if (!assertCompanyAccess(session, alert.boiler.companyId)) return null;
  return alert;
}

export async function getMaintenanceForSession(orderId: string, session: SessionUser) {
  const order = await prisma.maintenanceOrder.findUnique({
    where: { id: orderId },
    include: { boiler: { select: { companyId: true } } },
  });
  if (!order) return null;
  if (!assertCompanyAccess(session, order.boiler.companyId)) return null;
  return order;
}

export function mergeCompanyBoilerWhere(session: SessionUser) {
  const filter = companyFilter(session);
  if ("companyId" in filter && filter.companyId === "__none__") {
    return { id: "__none__" };
  }
  return filter;
}

export function mergeCompanyLogWhere(session: SessionUser) {
  const filter = companyFilter(session);
  if ("companyId" in filter && filter.companyId === "__none__") {
    return { boilerId: "__none__" };
  }
  if (Object.keys(filter).length === 0) return {};
  return { boiler: filter };
}

export function mergeCompanyAlertWhere(session: SessionUser) {
  return mergeCompanyLogWhere(session);
}

export function mergeCompanyMaintenanceWhere(session: SessionUser) {
  return mergeCompanyLogWhere(session);
}
