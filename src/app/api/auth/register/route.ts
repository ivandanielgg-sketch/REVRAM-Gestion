import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/schemas";
import { hashPassword, usernameFromEmail } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, name, companyName, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado." },
        { status: 409 }
      );
    }

    let baseUsername = usernameFromEmail(normalizedEmail);
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    let company = await prisma.company.findFirst({
      where: {
        name: { equals: companyName.trim(), mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: companyName.trim(), status: "ACTIVE" },
      });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        username,
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: "OPERATOR",
        status: "PENDING_APPROVAL",
        companyId: company.id,
      },
    });

    return NextResponse.json({
      message:
        "Cuenta registrada correctamente. Un administrador debe autorizar su acceso antes de poder ingresar.",
    });
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Error al registrar la cuenta" }, { status: 500 });
  }
}
