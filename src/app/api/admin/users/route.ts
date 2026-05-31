import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { buildAdminUsersWhere } from "@/lib/admin-users";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin(request);
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const where = buildAdminUsersWhere({
    status: params.get("status"),
    companyId: params.get("companyId"),
    role: params.get("role"),
    email: params.get("email"),
  });

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
      company: { select: { id: true, name: true, status: true } },
      rejectionReason: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
