import { prisma } from "@gamepool/database";

import { MatchJoinRequestRepository } from "@/features/matches/repositories/match-join-request.repository";
import { MatchRepository } from "@/features/matches/repositories/match.repository";
import { ParticipantRepository } from "@/features/matches/repositories/participant.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { blockPolicy } from "@/server/policies/block.policy";
import { matchVisibilityPolicy } from "@/server/policies/match-visibility.policy";
import { ApiError } from "@/server/errors/api-error";

export class MatchJoinService {
  constructor(
    private readonly joinRequests = new MatchJoinRequestRepository(),
    private readonly matches = new MatchRepository(),
    private readonly participants = new ParticipantRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async createRequest(userId: string, matchId: string, message?: string | null) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");

    await blockPolicy.assertNotBlocked(userId, match.hostUserId);
    await matchVisibilityPolicy.assertCanJoin(userId, match);

    if (match.hostUserId === userId) {
      throw new ApiError(400, "INVALID_REQUEST", "Host is already on the roster");
    }

    const existingParticipant = await this.participants.findActive(matchId, userId);
    if (existingParticipant) {
      throw new ApiError(409, "ALREADY_JOINED", "Already on roster or waitlist");
    }

    const pending = await this.joinRequests.findPending(matchId, userId);
    if (pending) throw new ApiError(409, "DUPLICATE_REQUEST", "Join request already pending");

    const request = await this.joinRequests.create({
      match: { connect: { id: matchId } },
      user: { connect: { id: userId } },
      message: message ?? null,
      status: "PENDING",
    });

    await this.notifications.notify({
      userId: match.hostUserId,
      type: "MATCH_JOIN_REQUEST",
      title: "New join request",
      body: `Someone requested to join ${match.title}`,
      entityType: "MATCH",
      entityId: matchId,
      payload: { joinRequestId: request.id },
    });

    return request;
  }

  async reviewRequest(
    hostUserId: string,
    matchId: string,
    requestId: string,
    action: "APPROVE" | "DECLINE",
  ) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== hostUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only host can review requests");
    }

    const request = await this.joinRequests.findById(requestId);
    if (!request || request.matchId !== matchId) {
      throw new ApiError(404, "NOT_FOUND", "Join request not found");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "INVALID_STATE", "Request is not pending");
    }

    if (action === "DECLINE") {
      const declined = await this.joinRequests.updateStatus(requestId, "DECLINED", hostUserId);
      await this.notifications.notify({
        userId: request.userId,
        type: "MATCH_JOIN_DECLINED",
        title: "Join request declined",
        body: `Your request to join ${match.title} was declined`,
        entityType: "MATCH",
        entityId: matchId,
      });
      return declined;
    }

    return prisma.$transaction(async (tx) => {
      const locked = await tx.match.findFirstOrThrow({ where: { id: matchId, deletedAt: null } });

      if (!["OPEN", "FULL"].includes(locked.status)) {
        throw new ApiError(400, "INVALID_STATE", "Match is not accepting participants");
      }

      const hasCapacity = locked.confirmedCount < locked.maxParticipants;

      if (!hasCapacity) {
        if (!locked.waitlistEnabled) {
          throw new ApiError(409, "MATCH_FULL", "Match is full");
        }

        await tx.matchParticipant.create({
          data: {
            matchId,
            userId: request.userId,
            role: "PARTICIPANT",
            status: "WAITLIST",
            approvedByUserId: hostUserId,
          },
        });

        await tx.matchJoinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", reviewedByUserId: hostUserId, reviewedAt: new Date() },
        });

        return { waitlisted: true };
      }

      await tx.matchParticipant.create({
        data: {
          matchId,
          userId: request.userId,
          role: "PARTICIPANT",
          status: "CONFIRMED",
          joinedAt: new Date(),
          approvedByUserId: hostUserId,
        },
      });

      const newCount = locked.confirmedCount + 1;
      await tx.match.update({
        where: { id: matchId },
        data: {
          confirmedCount: newCount,
          status: newCount >= locked.maxParticipants ? "FULL" : locked.status,
        },
      });

      await tx.matchJoinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedByUserId: hostUserId, reviewedAt: new Date() },
      });

      await this.notifications.notify({
        userId: request.userId,
        type: "MATCH_JOIN_APPROVED",
        title: "Join request approved",
        body: `You are confirmed for ${match.title}`,
        entityType: "MATCH",
        entityId: matchId,
      });

      if (newCount >= locked.maxParticipants) {
        await this.notifications.notify({
          userId: match.hostUserId,
          type: "MATCH_FULL",
          title: "Match is full",
          body: `${match.title} has reached capacity`,
          entityType: "MATCH",
          entityId: matchId,
        });
      }

      return { waitlisted: false };
    });
  }

  async listForMatch(hostUserId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== hostUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only host can list join requests");
    }
    return this.joinRequests.listByMatch(matchId, "PENDING");
  }

  async joinWaitlist(userId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (!match.waitlistEnabled) throw new ApiError(400, "WAITLIST_DISABLED", "Waitlist disabled");
    if (match.status !== "FULL") throw new ApiError(400, "INVALID_STATE", "Match is not full");

    await matchVisibilityPolicy.assertCanJoin(userId, match);

    const existing = await this.participants.findActive(matchId, userId);
    if (existing) throw new ApiError(409, "ALREADY_JOINED", "Already on roster or waitlist");

    return this.participants.create({
      match: { connect: { id: matchId } },
      user: { connect: { id: userId } },
      role: "PARTICIPANT",
      status: "WAITLIST",
    });
  }

  async leaveMatch(userId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(match.status)) {
      throw new ApiError(400, "INVALID_STATE", "Cannot leave match in current state");
    }

    const participant = await this.participants.findActive(matchId, userId);
    if (!participant) throw new ApiError(404, "NOT_FOUND", "Not a participant");

    if (participant.role === "HOST") {
      throw new ApiError(400, "INVALID_REQUEST", "Host cannot leave; cancel match instead");
    }

    return prisma.$transaction(async (tx) => {
      await tx.matchParticipant.update({
        where: { id: participant.id },
        data: { status: "LEFT", leftAt: new Date() },
      });

      if (participant.status === "CONFIRMED") {
        const locked = await tx.match.findFirstOrThrow({ where: { id: matchId } });
        const newCount = Math.max(0, locked.confirmedCount - 1);
        await tx.match.update({
          where: { id: matchId },
          data: { confirmedCount: newCount, status: locked.status === "FULL" ? "OPEN" : locked.status },
        });

        const next = await tx.matchParticipant.findFirst({
          where: { matchId, status: "WAITLIST", deletedAt: null },
          orderBy: { createdAt: "asc" },
        });

        if (next) {
          await tx.matchParticipant.update({
            where: { id: next.id },
            data: { status: "CONFIRMED", joinedAt: new Date() },
          });

          await tx.match.update({
            where: { id: matchId },
            data: {
              confirmedCount: newCount + 1,
              status: newCount + 1 >= locked.maxParticipants ? "FULL" : "OPEN",
            },
          });

          await this.notifications.notify({
            userId: next.userId,
            type: "WAITLIST_PROMOTED",
            title: "Waitlist promotion",
            body: `A spot opened in ${match.title}`,
            entityType: "MATCH",
            entityId: matchId,
          });
        }
      }

      return { left: true };
    });
  }

  async removeParticipant(hostUserId: string, matchId: string, targetUserId: string, reason?: string | null) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== hostUserId) throw new ApiError(403, "FORBIDDEN", "Only host can remove");

    const participant = await this.participants.findActive(matchId, targetUserId);
    if (!participant || participant.role === "HOST") {
      throw new ApiError(404, "NOT_FOUND", "Participant not found");
    }

    await this.leaveMatch(targetUserId, matchId);
    if (reason) {
      await prisma.matchParticipant.update({
        where: { id: participant.id },
        data: { removalReason: reason, status: "REMOVED" },
      });
    }
    return { removed: true };
  }
}
