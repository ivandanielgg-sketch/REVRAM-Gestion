import { UserRole } from "@/generated/prisma/client";

export type Permission =
  | "users.manage"
  | "boilers.manage"
  | "boilers.view"
  | "logs.create"
  | "logs.edit"
  | "logs.approve"
  | "logs.view"
  | "logs.export"
  | "alerts.manage"
  | "alerts.view"
  | "maintenance.manage"
  | "maintenance.view"
  | "reports.view"
  | "settings.manage"
  | "audit.view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMINISTRADOR: [
    "users.manage",
    "boilers.manage",
    "boilers.view",
    "logs.create",
    "logs.edit",
    "logs.approve",
    "logs.view",
    "logs.export",
    "alerts.manage",
    "alerts.view",
    "maintenance.manage",
    "maintenance.view",
    "reports.view",
    "settings.manage",
    "audit.view",
  ],
  SUPERVISOR: [
    "boilers.view",
    "logs.create",
    "logs.edit",
    "logs.approve",
    "logs.view",
    "logs.export",
    "alerts.manage",
    "alerts.view",
    "maintenance.view",
    "reports.view",
    "audit.view",
  ],
  OPERADOR: ["boilers.view", "logs.create", "logs.edit", "logs.view", "alerts.view"],
  MANTENIMIENTO: [
    "boilers.view",
    "logs.view",
    "alerts.view",
    "maintenance.manage",
    "maintenance.view",
  ],
  SOLO_CONSULTA: ["boilers.view", "logs.view", "logs.export", "alerts.view", "maintenance.view", "reports.view"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canEditLog(role: UserRole, status: string): boolean {
  if (status === "APROBADO" || status === "BLOQUEADO") return false;
  if (role === "SOLO_CONSULTA") return false;
  if (role === "MANTENIMIENTO") return false;
  return true;
}

export function canApproveLog(role: UserRole): boolean {
  return role === "ADMINISTRADOR" || role === "SUPERVISOR";
}
