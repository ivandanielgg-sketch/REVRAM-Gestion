import { jwtVerify } from "jose";
import { UserRole, UserStatus } from "@/generated/prisma/client";

export const SESSION_COOKIE = "boiler_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  companyId: string | null;
  companyName: string | null;
  mustChangePassword: boolean;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      name: (payload.name as string) || (payload.username as string),
      role: payload.role as UserRole,
      status: payload.status as UserStatus,
      companyId: (payload.companyId as string) || null,
      companyName: (payload.companyName as string) || null,
      mustChangePassword: payload.mustChangePassword as boolean,
    };
  } catch {
    return null;
  }
}

export function isLoginAllowedStatus(status: UserStatus): boolean {
  return status === "ACTIVE";
}

export function loginBlockedMessage(status: UserStatus): string {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Tu cuenta está pendiente de autorización por un administrador.";
    case "REJECTED":
      return "Tu solicitud de cuenta fue rechazada. Contacte al administrador.";
    case "DISABLED":
      return "Tu cuenta está deshabilitada. Contacte al administrador.";
    case "DELETED":
      return "Tu cuenta no está disponible. Contacte al administrador.";
    default:
      return "No puede iniciar sesión con esta cuenta.";
  }
}
