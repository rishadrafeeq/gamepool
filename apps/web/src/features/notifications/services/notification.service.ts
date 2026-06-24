import type { NotificationEntityType, NotificationType } from "@gamepool/database";

import { NotificationRepository } from "@/features/notifications/repositories/notification.repository";

export class NotificationService {
  constructor(private readonly notifications = new NotificationRepository()) {}

  notify(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    entityType?: NotificationEntityType;
    entityId?: string;
  }) {
    return this.notifications.create(input);
  }

  list(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      this.notifications.list(userId, skip, limit),
      this.notifications.count(userId),
    ]).then(([items, total]) => ({ items, meta: { page, limit, total } }));
  }

  markRead(userId: string, notificationId: string) {
    return this.notifications.markRead(notificationId, userId);
  }

  markAllRead(userId: string) {
    return this.notifications.markAllRead(userId);
  }
}
