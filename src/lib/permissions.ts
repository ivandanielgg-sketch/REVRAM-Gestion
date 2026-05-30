import { UserRole } from "@/generated/prisma/client";

export type Permission =
  | "users.manage"
  | "users.manage_company"
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
  | "audit.view"
  | "admin.global";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "admin.global",
    "users.manage",
    "users.manage_company",
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
  COMPANY_ADMIN: [
    "users.manage_company",
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
  OPERATOR: ["boilers.view", "logs.create", "logs.edit", "logs.view", "alerts.view"],
  MAINTENANCE: [
    "boilers.view",
    "logs.view",
    "alerts.view",
    "maintenance.manage",
    "maintenance.view",
  ],
  VIEWER: [
    "boilers.view",
    "logs.view",
    "logs.export",
    "alerts.view",
    "maintenance.view",
    "reports.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canEditLog(role: UserRole, status: string): boolean {
  if (status === "APROBADO" || status === "BLOQUEADO") return false;
  if (role === "VIEWER") return false;
  if (role === "MAINTENANCE") return false;
  return true;
}

export function canApproveLog(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "SUPERVISOR";
}
