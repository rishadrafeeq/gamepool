import { prisma } from "@gamepool/database";
import type { Prisma } from "@gamepool/database";
import type {
  CreateMatchBody,
  ListMatchesQuery,
  UpdateMatchBody,
} from "@gamepool/shared";

import { MatchRepository } from "@/features/matches/repositories/match.repository";
import { ParticipantRepository } from "@/features/matches/repositories/participant.repository";
import { SportRepository } from "@/features/sports/repositories/sport.repository";
import { blockPolicy } from "@/server/policies/block.policy";
import { connectionPolicy } from "@/server/policies/connection.policy";
import { matchVisibilityPolicy } from "@/server/policies/match-visibility.policy";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class MatchService {
  constructor(
    private readonly matches = new MatchRepository(),
    private readonly participants = new ParticipantRepository(),
    private readonly sports = new SportRepository(),
  ) {}

  async create(hostUserId: string, body: CreateMatchBody) {
    const sport = await this.sports.findById(body.sportId);
    if (!sport) throw new ApiError(400, "INVALID_SPORT", "Sport not found");

    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          hostUserId,
          sportId: body.sportId,
          title: body.title,
          format: body.format,
          notes: body.notes,
          status: "DRAFT",
          visibility: body.visibility,
          skillLevelExpected: body.skillLevelExpected,
          startsAt: new Date(body.startsAt),
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          durationMinutes: body.durationMinutes,
          venueName: body.venueName,
          venueAddress: body.venueAddress,
          venueLatitude: body.venueLatitude,
          venueLongitude: body.venueLongitude,
          city: body.city,
          area: body.area,
          maxParticipants: body.maxParticipants,
          waitlistEnabled: body.waitlistEnabled,
          leaveCutoffHours: body.leaveCutoffHours,
        },
        include: { sport: true },
      });

      await tx.matchParticipant.create({
        data: {
          matchId: created.id,
          userId: hostUserId,
          role: "HOST",
          status: "CONFIRMED",
          joinedAt: new Date(),
        },
      });

      await tx.match.update({
        where: { id: created.id },
        data: { confirmedCount: 1 },
      });

      return created;
    });

    return match;
  }

  async update(hostUserId: string, matchId: string, body: UpdateMatchBody) {
    const match = await this.getHostMatch(hostUserId, matchId);
    if (!["DRAFT", "OPEN"].includes(match.status)) {
      throw new ApiError(400, "INVALID_STATE", "Match cannot be updated in current state");
    }

    return this.matches.update(matchId, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.format !== undefined ? { format: body.format } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
      ...(body.skillLevelExpected !== undefined
        ? { skillLevelExpected: body.skillLevelExpected }
        : {}),
      ...(body.startsAt !== undefined ? { startsAt: new Date(body.startsAt) } : {}),
      ...(body.endsAt !== undefined
        ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
        : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
      ...(body.venueName !== undefined ? { venueName: body.venueName } : {}),
      ...(body.venueAddress !== undefined ? { venueAddress: body.venueAddress } : {}),
      ...(body.venueLatitude !== undefined ? { venueLatitude: body.venueLatitude } : {}),
      ...(body.venueLongitude !== undefined ? { venueLongitude: body.venueLongitude } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.area !== undefined ? { area: body.area } : {}),
      ...(body.maxParticipants !== undefined ? { maxParticipants: body.maxParticipants } : {}),
      ...(body.waitlistEnabled !== undefined ? { waitlistEnabled: body.waitlistEnabled } : {}),
      ...(body.leaveCutoffHours !== undefined ? { leaveCutoffHours: body.leaveCutoffHours } : {}),
    });
  }

  async publish(hostUserId: string, matchId: string) {
    const match = await this.getHostMatch(hostUserId, matchId);
    if (match.status !== "DRAFT") {
      throw new ApiError(400, "INVALID_STATE", "Only draft matches can be published");
    }
    return this.matches.update(matchId, { status: "OPEN" });
  }

  async cancel(hostUserId: string, matchId: string) {
    const match = await this.getHostMatch(hostUserId, matchId);
    if (["COMPLETED", "CANCELLED"].includes(match.status)) {
      throw new ApiError(400, "INVALID_STATE", "Match already terminal");
    }
    return this.matches.update(matchId, { status: "CANCELLED" });
  }

  async start(hostUserId: string, matchId: string) {
    const match = await this.getHostMatch(hostUserId, matchId);
    if (!["OPEN", "FULL"].includes(match.status)) {
      throw new ApiError(400, "INVALID_STATE", "Match cannot be started");
    }
    return this.matches.update(matchId, { status: "IN_PROGRESS" });
  }

  async complete(hostUserId: string, matchId: string) {
    const match = await this.getHostMatch(hostUserId, matchId);
    if (match.status !== "IN_PROGRESS") {
      throw new ApiError(400, "INVALID_STATE", "Match is not in progress");
    }
    return this.matches.update(matchId, { status: "COMPLETED" });
  }

  async getById(viewerId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    await matchVisibilityPolicy.assertCanView(viewerId, match);
    const roster = await this.participants.listByMatch(matchId);
    return { ...match, roster };
  }

  async browse(viewerId: string, query: ListMatchesQuery) {
    const blocked = await blockPolicy.getBlockedUserIds(viewerId);
    const connections = await connectionPolicy.getConnectedUserIds(viewerId);
    const { skip, take } = paginate(query.page, query.limit);

    const baseFilter = matchVisibilityPolicy.buildDiscoveryFilter(viewerId, connections);

    const where: Prisma.MatchWhereInput = {
      ...baseFilter,
      hostUserId: { notIn: blocked },
      ...(query.sportId ? { sportId: query.sportId } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.area ? { area: query.area } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.skillLevel ? { skillLevelExpected: query.skillLevel } : {}),
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.matches.list(where, skip, take),
      this.matches.count(where),
    ]);

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async listParticipants(viewerId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    await matchVisibilityPolicy.assertCanView(viewerId, match);
    return this.participants.listByMatch(matchId);
  }

  private async getHostMatch(hostUserId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== hostUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only host can perform this action");
    }
    return match;
  }
}
