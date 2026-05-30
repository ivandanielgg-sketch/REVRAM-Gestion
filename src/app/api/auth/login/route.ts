import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifyPassword,
  setSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: parsed.data.username }, { email: parsed.data.username }],
        isActive: true,
      },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
