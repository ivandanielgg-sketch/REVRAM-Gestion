import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "audit.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const auditModule = searchParams.get("module");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const logs = await prisma.auditLog.findMany({
    where: auditModule ? { module: auditModule } : undefined,
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
