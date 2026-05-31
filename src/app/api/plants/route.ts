import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission } from "@/lib/api-auth";
import { plantSchema } from "@/lib/validations/schemas";
import { companyFilter, isSuperAdmin } from "@/lib/tenant";
import { normalizePlantName, PLANT_DUPLICATE_ERROR } from "@/lib/plant-utils";
import { resolveTargetCompanyId } from "@/lib/security";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { error, session } = await requireAnyPermission(request, ["settings.manage", "boilers.view"]);
  if (error || !session) return error;

  const companyWhere = companyFilter(session);
  const plants = await prisma.plant.findMany({
    where: {
      ...companyWhere,
      deletedAt: null,
    },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { boilers: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(plants);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requirePermission(request, "settings.manage");
  if (error || !session) return error;

  const body = await request.json();
  const parsed = plantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const companyId = resolveTargetCompanyId(session, parsed.data.companyId);
  if (!companyId) {
    return NextResponse.json({ error: "Empresa requerida" }, { status: 400 });
  }

  const normalizedName = normalizePlantName(parsed.data.name);

  try {
    const plant = await prisma.plant.create({
      data: {
        name: parsed.data.name.trim(),
        normalizedName,
        client: parsed.data.client?.trim() || null,
        location: parsed.data.location?.trim() || null,
        address: parsed.data.address?.trim() || parsed.data.location?.trim() || null,
        contact: parsed.data.contact?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        email: parsed.data.email?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        companyId,
      },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { boilers: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: "CREAR_REGISTRO",
      module: "plants",
      recordId: plant.id,
      newValue: plant,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(plant, { status: 201 });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: PLANT_DUPLICATE_ERROR }, { status: 409 });
    }
    throw err;
  }
}
