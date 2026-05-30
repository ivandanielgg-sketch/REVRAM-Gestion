import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/schemas";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.status === "ACTIVE" && !user.deletedAt) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await sendPasswordResetEmail(user.email, token);
  }

  return NextResponse.json({
    message: "Si el correo existe en el sistema, recibirás una liga para restablecer tu contraseña.",
  });
}
