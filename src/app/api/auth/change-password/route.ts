import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  hashPassword,
  verifyPassword,
  getClientIp,
  createSessionToken,
  attachSessionCookie,
} from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Sesión expirada. Inicie sesión otra vez." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.id,
      action: "CAMBIAR_CONTRASENA",
      module: "auth",
      recordId: user.id,
      ipAddress: getClientIp(request),
    });

    const token = await createSessionToken({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });

    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("[auth/change-password]", error);
    return NextResponse.json(
      { error: "No se pudo cambiar la contraseña. Intente nuevamente." },
      { status: 500 }
    );
  }
}
