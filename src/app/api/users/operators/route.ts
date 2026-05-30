import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "logs.view");
  if (error) return error;

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["OPERADOR", "SUPERVISOR", "ADMINISTRADOR"] },
    },
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}
