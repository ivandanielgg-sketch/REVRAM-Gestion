import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyTokenHash } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations/schemas";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const tokens = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const resetToken = await (async () => {
    for (const candidate of tokens) {
      if (await verifyTokenHash(parsed.data.token, candidate.tokenHash)) {
        return candidate;
      }
    }
    return null;
  })();

  if (!resetToken) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: resetToken.userId,
    action: "CAMBIAR_CONTRASENA",
    module: "auth",
    recordId: resetToken.userId,
  });

  return NextResponse.json({
    success: true,
    message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
  });
}
