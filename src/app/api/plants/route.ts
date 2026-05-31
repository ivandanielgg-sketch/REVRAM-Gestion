import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { companyFilter } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { error, session } = await requirePermission(request, "boilers.view");
  if (error || !session) return error;

  const companyWhere = companyFilter(session);
  const plants = await prisma.plant.findMany({
    where: Object.keys(companyWhere).length ? companyWhere : undefined,
    include: { _count: { select: { boilers: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(plants);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const body = await request.json();
  const plant = await prisma.plant.create({
    data: {
      ...body,
      companyId: body.companyId || session.companyId,
    },
  });
  return NextResponse.json(plant, { status: 201 });
}
