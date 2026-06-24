import { prisma } from "@gamepool/database";
import type {
  CreateOpponentRequestBody,
  PairOpponentRequestBody,
  UpdateOpponentRequestBody,
} from "@gamepool/shared";

import { OpponentRequestRepository } from "@/features/opponents/repositories/opponent-request.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { SportRepository } from "@/features/sports/repositories/sport.repository";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class OpponentRequestService {
  constructor(
    private readonly requests = new OpponentRequestRepository(),
    private readonly sports = new SportRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async create(userId: string, body: CreateOpponentRequestBody) {
    const sport = await this.sports.findById(body.sportId);
    if (!sport) throw new ApiError(400, "INVALID_SPORT", "Sport not found");

    return this.requests.create({
      creator: { connect: { id: userId } },
      sport: { connect: { id: body.sportId } },
      ...(body.matchId ? { match: { connect: { id: body.matchId } } } : {}),
      title: body.title,
      format: body.format,
      skillLevel: body.skillLevel,
      city: body.city,
      area: body.area,
      scheduledStartsAt: body.scheduledStartsAt ? new Date(body.scheduledStartsAt) : null,
      scheduledEndsAt: body.scheduledEndsAt ? new Date(body.scheduledEndsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: "OPEN",
    });
  }

  async update(creatorUserId: string, id: string, body: UpdateOpponentRequestBody) {
    await this.getOwned(creatorUserId, id);
    return this.requests.update(id, body);
  }

  async getById(id: string) {
    const request = await this.requests.findById(id);
    if (!request) throw new ApiError(404, "NOT_FOUND", "Opponent request not found");
    return request;
  }

  async list(query: {
    page: number;
    limit: number;
    sportId?: string;
    city?: string;
    status?: string;
  }) {
    const { skip, take } = paginate(query.page, query.limit);
    const where = {
      ...(query.sportId ? { sportId: query.sportId } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.status ? { status: query.status as never } : { status: "OPEN" as const }),
    };
    const [items, total] = await Promise.all([
      this.requests.list(where, skip, take),
      this.requests.count(where),
    ]);
    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async expressInterest(userId: string, requestId: string) {
    const request = await this.getById(requestId);
    if (request.status !== "OPEN") throw new ApiError(400, "INVALID_STATE", "Request is closed");
    if (request.creatorUserId === userId) {
      throw new ApiError(400, "INVALID_REQUEST", "Cannot express interest on own request");
    }

    const existing = await this.requests.findInterest(requestId, userId);
    if (existing) throw new ApiError(409, "DUPLICATE_INTEREST", "Interest already submitted");

    const interest = await this.requests.createInterest(requestId, userId);

    await this.notifications.notify({
      userId: request.creatorUserId,
      type: "OPPONENT_REQUEST_INTEREST",
      title: "Opponent interest",
      body: `A side is interested in ${request.title}`,
      entityType: "OPPONENT_REQUEST",
      entityId: requestId,
    });

    return interest;
  }

  async reviewInterest(
    creatorUserId: string,
    requestId: string,
    interestId: string,
    action: "APPROVE" | "DECLINE",
  ) {
    const request = await this.getOwned(creatorUserId, requestId);
    const interest = request.interests.find((i) => i.id === interestId);
    if (!interest) throw new ApiError(404, "NOT_FOUND", "Interest not found");
    if (interest.status !== "PENDING") throw new ApiError(400, "INVALID_STATE", "Interest not pending");

    const status = action === "APPROVE" ? "APPROVED" : "DECLINED";
    const updated = await this.requests.updateInterest(interestId, status);

    await this.notifications.notify({
      userId: interest.userId,
      type:
        action === "APPROVE" ? "OPPONENT_REQUEST_APPROVED" : "OPPONENT_REQUEST_DECLINED",
      title: action === "APPROVE" ? "Opponent interest approved" : "Opponent interest declined",
      body: `Your interest in ${request.title} was ${action.toLowerCase()}d`,
      entityType: "OPPONENT_REQUEST",
      entityId: requestId,
    });

    return updated;
  }

  async pair(creatorUserId: string, requestId: string, body: PairOpponentRequestBody) {
    const request = await this.getOwned(creatorUserId, requestId);
    if (request.status !== "OPEN") throw new ApiError(400, "INVALID_STATE", "Request not open");

    const opponent = await this.requests.findById(body.opponentRequestId);
    if (!opponent || opponent.status !== "OPEN") {
      throw new ApiError(404, "NOT_FOUND", "Opponent request not found or not open");
    }

    return prisma.$transaction(async (tx) => {
      await tx.opponentRequest.update({
        where: { id: requestId },
        data: {
          status: "MATCHED",
          matchedRequestId: body.opponentRequestId,
          ...(body.matchId ? { matchId: body.matchId } : {}),
        },
      });

      await tx.opponentRequest.update({
        where: { id: body.opponentRequestId },
        data: {
          status: "MATCHED",
          matchedRequestId: requestId,
          ...(body.matchId ? { matchId: body.matchId } : {}),
        },
      });

      return { paired: true, requestId, opponentRequestId: body.opponentRequestId };
    });
  }

  async cancel(creatorUserId: string, id: string) {
    await this.getOwned(creatorUserId, id);
    return this.requests.update(id, { status: "CLOSED" });
  }

  private async getOwned(creatorUserId: string, id: string) {
    const request = await this.requests.findById(id);
    if (!request) throw new ApiError(404, "NOT_FOUND", "Opponent request not found");
    if (request.creatorUserId !== creatorUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only creator can modify");
    }
    return request;
  }
}
