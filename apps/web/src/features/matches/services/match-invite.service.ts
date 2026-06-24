import { prisma } from "@gamepool/database";
import type { CreateMatchInviteBody } from "@gamepool/shared";

import { MatchInviteRepository } from "@/features/matches/repositories/match-invite.repository";
import { MatchRepository } from "@/features/matches/repositories/match.repository";
import { ParticipantRepository } from "@/features/matches/repositories/participant.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { blockPolicy } from "@/server/policies/block.policy";
import { ApiError } from "@/server/errors/api-error";

export class MatchInviteService {
  constructor(
    private readonly invites = new MatchInviteRepository(),
    private readonly matches = new MatchRepository(),
    private readonly participants = new ParticipantRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async create(inviterUserId: string, matchId: string, body: CreateMatchInviteBody) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== inviterUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only host can send invites");
    }
    if (match.visibility !== "INVITE_ONLY" && match.visibility !== "CONNECTIONS_ONLY") {
      throw new ApiError(400, "INVALID_STATE", "Invites only for restricted visibility matches");
    }

    await blockPolicy.assertNotBlocked(inviterUserId, body.inviteeUserId);

    const existing = await this.invites.findPending(matchId, body.inviteeUserId);
    if (existing) throw new ApiError(409, "DUPLICATE_INVITE", "Invite already pending");

    const invite = await this.invites.create({
      match: { connect: { id: matchId } },
      inviter: { connect: { id: inviterUserId } },
      invitee: { connect: { id: body.inviteeUserId } },
      message: body.message ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      status: "PENDING",
    });

    await this.notifications.notify({
      userId: body.inviteeUserId,
      type: "MATCH_INVITE",
      title: "Match invite",
      body: `You were invited to ${match.title}`,
      entityType: "MATCH",
      entityId: matchId,
      payload: { inviteId: invite.id },
    });

    return invite;
  }

  async listForMatch(hostUserId: string, matchId: string) {
    const match = await this.matches.findById(matchId);
    if (!match) throw new ApiError(404, "NOT_FOUND", "Match not found");
    if (match.hostUserId !== hostUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only host can list invites");
    }
    return this.invites.listByMatch(matchId);
  }

  async respond(inviteeUserId: string, inviteId: string, action: "ACCEPT" | "DECLINE") {
    const invite = await this.invites.findById(inviteId);
    if (!invite) throw new ApiError(404, "NOT_FOUND", "Invite not found");
    if (invite.inviteeUserId !== inviteeUserId) {
      throw new ApiError(403, "FORBIDDEN", "Only invitee can respond");
    }
    if (invite.status !== "PENDING") {
      throw new ApiError(400, "INVALID_STATE", "Invite is not pending");
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await this.invites.updateStatus(inviteId, "EXPIRED");
      throw new ApiError(400, "INVITE_EXPIRED", "Invite has expired");
    }

    if (action === "DECLINE") {
      const declined = await this.invites.updateStatus(inviteId, "DECLINED");
      await this.notifications.notify({
        userId: invite.inviterUserId,
        type: "MATCH_INVITE_DECLINED",
        title: "Invite declined",
        body: `Your invite to ${invite.match.title} was declined`,
        entityType: "MATCH",
        entityId: invite.matchId,
      });
      return declined;
    }

    return prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirstOrThrow({
        where: { id: invite.matchId, deletedAt: null },
      });

      if (!["OPEN", "FULL"].includes(match.status)) {
        throw new ApiError(400, "INVALID_STATE", "Match is not accepting participants");
      }

      const existing = await tx.matchParticipant.findFirst({
        where: { matchId: invite.matchId, userId: inviteeUserId, deletedAt: null },
      });
      if (existing && ["CONFIRMED", "WAITLIST"].includes(existing.status)) {
        throw new ApiError(409, "ALREADY_JOINED", "Already on roster or waitlist");
      }

      const hasCapacity = match.confirmedCount < match.maxParticipants;

      if (!hasCapacity) {
        if (!match.waitlistEnabled) {
          throw new ApiError(409, "MATCH_FULL", "Match is full");
        }

        await tx.matchParticipant.create({
          data: {
            matchId: invite.matchId,
            userId: inviteeUserId,
            role: "PARTICIPANT",
            status: "WAITLIST",
          },
        });
      } else {
        await tx.matchParticipant.create({
          data: {
            matchId: invite.matchId,
            userId: inviteeUserId,
            role: "PARTICIPANT",
            status: "CONFIRMED",
            joinedAt: new Date(),
          },
        });

        const newCount = match.confirmedCount + 1;
        await tx.match.update({
          where: { id: invite.matchId },
          data: {
            confirmedCount: newCount,
            status: newCount >= match.maxParticipants ? "FULL" : match.status,
          },
        });
      }

      const accepted = await tx.matchInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      await this.notifications.notify({
        userId: invite.inviterUserId,
        type: "MATCH_INVITE_ACCEPTED",
        title: "Invite accepted",
        body: `Your invite to ${match.title} was accepted`,
        entityType: "MATCH",
        entityId: invite.matchId,
      });

      return accepted;
    });
  }
}
