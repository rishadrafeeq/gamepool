import { prisma } from "@gamepool/database";

export class MatchChatRepository {
  listByMatch(matchId: string, limit = 100) {
    return prisma.matchChatMessage.findMany({
      where: { matchId },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  create(matchId: string, userId: string, body: string) {
    return prisma.matchChatMessage.create({
      data: { matchId, userId, body },
      include: {
        user: { include: { profile: true } },
      },
    });
  }

  deleteByMatch(matchId: string) {
    return prisma.matchChatMessage.deleteMany({ where: { matchId } });
  }
}
