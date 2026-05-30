import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(request, "users.manage");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = userSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    username: parsed.data.username,
    email: parsed.data.email,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  };
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json(user);
}
