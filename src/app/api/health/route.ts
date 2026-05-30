import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function databaseHint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return "DATABASE_URL no está configurada en Render. Agregue la Internal Database URL de PostgreSQL.";
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    return "DATABASE_URL inválida. Debe ser la URL completa (ej. postgresql://usuario:pass@dpg-xxxxx-a/nombre_db).";
  }
  return "Verifique que DATABASE_URL sea la Internal Database URL y que la base PostgreSQL esté activa.";
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          status: "error",
          database: "disconnected",
          message: databaseHint(),
        },
        { status: 503 }
      );
    }

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
          error instanceof Error
            ? `${error.message}. ${databaseHint()}`
            : databaseHint(),
      },
      { status: 503 }
    );
  }
}
