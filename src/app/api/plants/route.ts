import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, "boilers.view");
  if (error) return error;

  const plants = await prisma.plant.findMany({
    include: { _count: { select: { boilers: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(plants);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(request, "settings.manage");
  if (error) return error;

  const body = await request.json();
  const plant = await prisma.plant.create({ data: body });
  return NextResponse.json(plant, { status: 201 });
}
