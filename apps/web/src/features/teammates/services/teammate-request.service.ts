import type {
  CreateTeammateRequestBody,
  UpdateTeammateRequestBody,
} from "@gamepool/shared";

import { TeammateRequestRepository } from "@/features/teammates/repositories/teammate-request.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { SportRepository } from "@/features/sports/repositories/sport.repository";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class TeammateRequestService {
  constructor(
    private readonly requests = new TeammateRequestRepository(),
    private readonly sports = new SportRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async create(userId: string, body: CreateTeammateRequestBody) {
    const sport = await this.sports.findById(body.sportId);
    if (!sport) throw new ApiError(400, "INVALID_SPORT", "Sport not found");

    return this.requests.create({
      creator: { connect: { id: userId } },
      sport: { connect: { id: body.sportId } },
      ...(body.matchId ? { match: { connect: { id: body.matchId } } } : {}),
      title: body.title,
      description: body.description,
      requiredPlayers: body.requiredPlayers,
      skillLevel: body.skillLevel,
      city: body.city,
      area: body.area,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: "OPEN",
    });
  }

  async update(creatorUserId: string, id: string, body: UpdateTeammateRequestBody) {
    await this.getOwned(creatorUserId, id);
    return this.requests.update(id, body);
  }

  async getById(id: string) {
    const request = await this.requests.findById(id);
    if (!request) throw new ApiError(404, "NOT_FOUND", "Teammate request not found");
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

    const existing = await this.requests.findInterest(requestId, userId);
    if (existing) throw new ApiError(409, "DUPLICATE_INTEREST", "Interest already submitted");

    const interest = await this.requests.createInterest(requestId, userId);

    await this.notifications.notify({
      userId: request.creatorUserId,
      type: "TEAMMATE_REQUEST_INTEREST",
      title: "Teammate interest",
      body: `Someone is interested in ${request.title}`,
      entityType: "TEAMMATE_REQUEST",
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
        action === "APPROVE" ? "TEAMMATE_REQUEST_APPROVED" : "TEAMMATE_REQUEST_DECLINED",
      title: action === "APPROVE" ? "Teammate request approved" : "Teammate request declined",
      body: `Your interest in ${request.title} was ${action.toLowerCase()}d`,
      entityType: "TEAMMATE_REQUEST",
      entityId: requestId,
    });

    return updated;
  }

  async cancel(creatorUserId: string, id: string) {
    await this.getOwned(creatorUserId, id);
    return this.requests.update(id, { status: "CLOSED" });
  }

  private async getOwned(creatorUserId: string, id: string) {
    const request = await this.requests.findById(id);
    if (!request) throw new ApiError(404, "NOT_FOUND", "Teammate request not found");
    if (request.creatorUserId !== creatorUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only creator can modify");
    }
    return request;
  }
}
