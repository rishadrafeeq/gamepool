import type { Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class TeammateRequestRepository {
  findById(id: string) {
    return prisma.teammateRequest.findFirst({
      where: { id, deletedAt: null },
      include: { sport: true, creator: { include: { profile: true } }, interests: { include: { user: { include: { profile: true } } } } },
    });
  }

  create(data: Prisma.TeammateRequestCreateInput) {
    return prisma.teammateRequest.create({ data, include: { sport: true } });
  }

  update(id: string, data: Prisma.TeammateRequestUpdateInput) {
    return prisma.teammateRequest.update({ where: { id }, data });
  }

  list(where: Prisma.TeammateRequestWhereInput, skip: number, take: number) {
    return prisma.teammateRequest.findMany({
      where: { ...where, deletedAt: null },
      include: { sport: true, creator: { include: { profile: true } } },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  count(where: Prisma.TeammateRequestWhereInput) {
    return prisma.teammateRequest.count({ where: { ...where, deletedAt: null } });
  }

  createInterest(teammateRequestId: string, userId: string) {
    return prisma.teammateRequestInterest.create({
      data: { teammateRequestId, userId, status: "PENDING" },
    });
  }

  updateInterest(id: string, status: "APPROVED" | "DECLINED") {
    return prisma.teammateRequestInterest.update({ where: { id }, data: { status } });
  }

  findInterest(teammateRequestId: string, userId: string) {
    return prisma.teammateRequestInterest.findUnique({
      where: { teammateRequestId_userId: { teammateRequestId, userId } },
    });
  }
}
