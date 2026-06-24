import type { NotificationEntityType, NotificationType, Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class NotificationRepository {
  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    entityType?: NotificationEntityType;
    entityId?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        payload: (data.payload ?? {}) as Prisma.InputJsonValue,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }

  list(userId: string, skip: number, take: number) {
    return prisma.notification.findMany({
      where: { userId, deletedAt: null },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  count(userId: string) {
    return prisma.notification.count({ where: { userId, deletedAt: null } });
  }

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
