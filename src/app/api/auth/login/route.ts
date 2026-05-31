import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifyPassword,
  attachSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations/schemas";
import { isLoginAllowedStatus, loginBlockedMessage } from "@/lib/session";

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
        deletedAt: null,
      },
      include: { company: true },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!isLoginAllowedStatus(user.status)) {
      return NextResponse.json({ error: loginBlockedMessage(user.status) }, { status: 403 });
    }

    if (user.company && user.company.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "La empresa asociada a su cuenta está deshabilitada. Contacte al administrador." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      mustChangePassword: user.mustChangePassword,
    };

    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({ user: sessionUser });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("[auth/login]", error);
    const message =
      error instanceof Error && error.message.includes("DATABASE_URL")
        ? "Base de datos no configurada. Contacte al administrador."
        : "Error interno del servidor. Verifique la conexión a la base de datos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
