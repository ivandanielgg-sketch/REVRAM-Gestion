import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      users: userCount,
    });
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message:
          error instanceof Error ? error.message : "No se pudo conectar a la base de datos",
      },
      { status: 503 }
    );
  }
}
