import { prisma } from "@gamepool/database";
import type { Prisma } from "@gamepool/database";

export class AuditService {
  async log(input: {
    adminUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }) {
    return prisma.adminAuditEvent.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }
}

export const auditService = new AuditService();
