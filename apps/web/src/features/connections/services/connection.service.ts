import type { CreateConnectionBody, UpdateConnectionBody } from "@gamepool/shared";

import { ConnectionRepository } from "@/features/connections/repositories/connection.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { blockPolicy } from "@/server/policies/block.policy";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class ConnectionService {
  constructor(
    private readonly connections = new ConnectionRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async send(userId: string, body: CreateConnectionBody) {
    if (userId === body.recipientUserId) {
      throw new ApiError(400, "INVALID_REQUEST", "Cannot connect with yourself");
    }

    await blockPolicy.assertNotBlocked(userId, body.recipientUserId);

    const existing = await this.connections.findPendingPair(userId, body.recipientUserId);
    if (existing) {
      throw new ApiError(409, "DUPLICATE_CONNECTION", "Connection already exists");
    }

    const connection = await this.connections.create(userId, body.recipientUserId);

    await this.notifications.notify({
      userId: body.recipientUserId,
      type: "CONNECTION_REQUEST",
      title: "New Sports Connection request",
      body: "Someone wants to connect with you on GamePool",
      entityType: "SPORTS_CONNECTION",
      entityId: connection.id,
    });

    return connection;
  }

  async respond(userId: string, connectionId: string, body: UpdateConnectionBody) {
    const connection = await this.connections.findById(connectionId);
    if (!connection) throw new ApiError(404, "NOT_FOUND", "Connection not found");

    if (connection.recipientUserId !== userId) {
      throw new ApiError(403, "FORBIDDEN", "Only recipient can respond");
    }

    if (connection.status !== "PENDING") {
      throw new ApiError(400, "INVALID_STATE", "Connection is not pending");
    }

    const status = body.action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const updated = await this.connections.updateStatus(
      connectionId,
      status,
      body.action === "ACCEPT" ? new Date() : undefined,
    );

    await this.notifications.notify({
      userId: connection.requesterUserId,
      type: body.action === "ACCEPT" ? "CONNECTION_ACCEPTED" : "CONNECTION_DECLINED",
      title: body.action === "ACCEPT" ? "Connection accepted" : "Connection declined",
      body: `Your Sports Connection request was ${body.action.toLowerCase()}d`,
      entityType: "SPORTS_CONNECTION",
      entityId: connection.id,
    });

    return updated;
  }

  async list(userId: string, status: string | undefined, page: number, limit: number) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.connections.list(userId, status, skip, take),
      this.connections.count(userId, status),
    ]);
    return { items, meta: { page, limit, total } };
  }
}
