import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/client";

interface AuditParams {
  userId?: string;
  action: AuditAction;
  module: string;
  recordId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
    },
  });
}
