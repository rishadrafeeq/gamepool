import type { MatchInviteStatus, Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class MatchInviteRepository {
  findPending(matchId: string, inviteeUserId: string) {
    return prisma.matchInvite.findFirst({
      where: { matchId, inviteeUserId, status: "PENDING" },
    });
  }

  findById(id: string) {
    return prisma.matchInvite.findUnique({
      where: { id },
      include: {
        match: true,
        inviter: { include: { profile: true } },
        invitee: { include: { profile: true } },
      },
    });
  }

  create(data: Prisma.MatchInviteCreateInput) {
    return prisma.matchInvite.create({
      data,
      include: {
        invitee: { include: { profile: true } },
      },
    });
  }

  updateStatus(id: string, status: MatchInviteStatus) {
    return prisma.matchInvite.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });
  }

  listByMatch(matchId: string, status?: MatchInviteStatus) {
    return prisma.matchInvite.findMany({
      where: { matchId, ...(status ? { status } : {}) },
      include: { invitee: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listForInvitee(inviteeUserId: string, status?: MatchInviteStatus) {
    return prisma.matchInvite.findMany({
      where: { inviteeUserId, ...(status ? { status } : {}) },
      include: {
        match: { include: { sport: true } },
        inviter: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
