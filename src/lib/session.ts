import { jwtVerify } from "jose";
import { UserRole } from "@/generated/prisma/client";

export const SESSION_COOKIE = "boiler_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      mustChangePassword: payload.mustChangePassword as boolean,
    };
  } catch {
    return null;
  }
}
