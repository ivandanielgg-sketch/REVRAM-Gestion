import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { companyFilter } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "logs.view");
  if (error || !session) return error;

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      role: { in: ["OPERATOR", "SUPERVISOR", "COMPANY_ADMIN", "SUPER_ADMIN"] },
      ...companyFilter(session),
    },
    select: { id: true, username: true, name: true, role: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}
