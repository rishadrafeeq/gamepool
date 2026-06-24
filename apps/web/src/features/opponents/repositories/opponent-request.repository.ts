import type { Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class OpponentRequestRepository {
  findById(id: string) {
    return prisma.opponentRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        sport: true,
        creator: { include: { profile: true } },
        interests: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  create(data: Prisma.OpponentRequestCreateInput) {
    return prisma.opponentRequest.create({ data, include: { sport: true } });
  }

  update(id: string, data: Prisma.OpponentRequestUpdateInput) {
    return prisma.opponentRequest.update({ where: { id }, data });
  }

  list(where: Prisma.OpponentRequestWhereInput, skip: number, take: number) {
    return prisma.opponentRequest.findMany({
      where: { ...where, deletedAt: null },
      include: { sport: true, creator: { include: { profile: true } } },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  count(where: Prisma.OpponentRequestWhereInput) {
    return prisma.opponentRequest.count({ where: { ...where, deletedAt: null } });
  }

  createInterest(opponentRequestId: string, userId: string) {
    return prisma.opponentRequestInterest.create({
      data: { opponentRequestId, userId, status: "PENDING" },
    });
  }

  updateInterest(id: string, status: "APPROVED" | "DECLINED") {
    return prisma.opponentRequestInterest.update({ where: { id }, data: { status } });
  }

  findInterest(opponentRequestId: string, userId: string) {
    return prisma.opponentRequestInterest.findUnique({
      where: { opponentRequestId_userId: { opponentRequestId, userId } },
    });
  }
}
