import type { Match, MatchInviteStatus, MatchStatus, MatchVisibility } from "@gamepool/database";

import { connectionPolicy } from "@/server/policies/connection.policy";
import { ApiError } from "@/server/errors/api-error";
import { prisma } from "@gamepool/database";

export class MatchVisibilityPolicy {
  async canViewMatch(viewerId: string, match: Match): Promise<boolean> {
    if (match.deletedAt || match.hiddenFromDiscovery) {
      return match.hostUserId === viewerId || (await this.isParticipant(viewerId, match.id));
    }

    if (match.hostUserId === viewerId) return true;
    if (await this.isParticipant(viewerId, match.id)) return true;

    switch (match.visibility) {
      case "PUBLIC":
        return true;
      case "CONNECTIONS_ONLY":
        return connectionPolicy.areConnected(viewerId, match.hostUserId);
      case "INVITE_ONLY":
        return this.hasValidInvite(viewerId, match.id);
      default:
        return false;
    }
  }

  async assertCanView(viewerId: string, match: Match): Promise<void> {
    if (!(await this.canViewMatch(viewerId, match))) {
      throw new ApiError(404, "NOT_FOUND", "Match not found");
    }
  }

  async assertCanJoin(viewerId: string, match: Match): Promise<void> {
    await this.assertCanView(viewerId, match);

    if (!["OPEN", "FULL"].includes(match.status)) {
      throw new ApiError(400, "INVALID_STATE", `Cannot join match in ${match.status} state`);
    }
  }

  private async isParticipant(userId: string, matchId: string) {
    const p = await prisma.matchParticipant.findFirst({
      where: {
        matchId,
        userId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "WAITLIST"] },
      },
    });
    return Boolean(p);
  }

  private async hasValidInvite(userId: string, matchId: string) {
    const invite = await prisma.matchInvite.findFirst({
      where: {
        matchId,
        inviteeUserId: userId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
    return Boolean(invite);
  }

  buildDiscoveryFilter(viewerId: string, connectionIds: string[]) {
    const openStatuses: MatchStatus[] = ["OPEN", "FULL"];
    const inviteStatuses: MatchInviteStatus[] = ["PENDING", "ACCEPTED"];
    return {
      deletedAt: null,
      hiddenFromDiscovery: false,
      status: { in: openStatuses },
      OR: [
        { visibility: "PUBLIC" as MatchVisibility },
        {
          visibility: "CONNECTIONS_ONLY" as MatchVisibility,
          hostUserId: { in: connectionIds },
        },
        {
          visibility: "INVITE_ONLY" as MatchVisibility,
          OR: [
            { hostUserId: viewerId },
            {
              invites: {
                some: { inviteeUserId: viewerId, status: { in: inviteStatuses } },
              },
            },
          ],
        },
      ],
    };
  }
}

export const matchVisibilityPolicy = new MatchVisibilityPolicy();
