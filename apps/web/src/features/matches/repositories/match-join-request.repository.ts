import type { MatchJoinRequestStatus, Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class MatchJoinRequestRepository {
  findPending(matchId: string, userId: string) {
    return prisma.matchJoinRequest.findFirst({
      where: { matchId, userId, status: "PENDING" },
    });
  }

  findById(id: string) {
    return prisma.matchJoinRequest.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
  }

  create(data: Prisma.MatchJoinRequestCreateInput) {
    return prisma.matchJoinRequest.create({ data, include: { user: { include: { profile: true } } } });
  }

  updateStatus(
    id: string,
    status: MatchJoinRequestStatus,
    reviewedByUserId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.matchJoinRequest.update({
      where: { id },
      data: { status, reviewedByUserId, reviewedAt: new Date() },
    });
  }

  listByMatch(matchId: string, status?: MatchJoinRequestStatus) {
    return prisma.matchJoinRequest.findMany({
      where: { matchId, ...(status ? { status } : {}) },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
}
