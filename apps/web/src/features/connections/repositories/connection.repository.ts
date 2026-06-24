import { prisma } from "@gamepool/database";

export class ConnectionRepository {
  findById(id: string) {
    return prisma.sportsConnection.findUnique({ where: { id } });
  }

  findPendingPair(requesterUserId: string, recipientUserId: string) {
    return prisma.sportsConnection.findFirst({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [
          { requesterUserId, recipientUserId },
          { requesterUserId: recipientUserId, recipientUserId: requesterUserId },
        ],
      },
    });
  }

  create(requesterUserId: string, recipientUserId: string) {
    return prisma.sportsConnection.create({
      data: { requesterUserId, recipientUserId, status: "PENDING" },
    });
  }

  updateStatus(id: string, status: "ACCEPTED" | "DECLINED", acceptedAt?: Date) {
    return prisma.sportsConnection.update({
      where: { id },
      data: { status, acceptedAt: acceptedAt ?? null },
    });
  }

  list(userId: string, status: string | undefined, skip: number, take: number) {
    return prisma.sportsConnection.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        OR: [{ requesterUserId: userId }, { recipientUserId: userId }],
      },
      include: {
        requester: { include: { profile: true } },
        recipient: { include: { profile: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  count(userId: string, status?: string) {
    return prisma.sportsConnection.count({
      where: {
        ...(status ? { status: status as never } : {}),
        OR: [{ requesterUserId: userId }, { recipientUserId: userId }],
      },
    });
  }
}
