import type { ParticipantStatus, Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class ParticipantRepository {
  findActive(matchId: string, userId: string) {
    return prisma.matchParticipant.findFirst({
      where: { matchId, userId, deletedAt: null, status: { in: ["PENDING", "CONFIRMED", "WAITLIST"] } },
    });
  }

  listByMatch(matchId: string) {
    return prisma.matchParticipant.findMany({
      where: { matchId, deletedAt: null, status: { in: ["CONFIRMED", "WAITLIST", "PENDING"] } },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  create(data: Prisma.MatchParticipantCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.matchParticipant.create({ data });
  }

  updateStatus(
    id: string,
    status: ParticipantStatus,
    extra: Prisma.MatchParticipantUpdateInput = {},
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.matchParticipant.update({ where: { id }, data: { status, ...extra } });
  }

  firstWaitlisted(matchId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.matchParticipant.findFirst({
      where: { matchId, status: "WAITLIST", deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }
}
