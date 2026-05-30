import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword, getClientIp } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid && !user.mustChangePassword) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await createAuditLog({
    userId: session.id,
    action: "CAMBIAR_CONTRASENA",
    module: "auth",
    recordId: user.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
