import type { Prisma } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class MatchRepository {
  findById(id: string) {
    return prisma.match.findFirst({
      where: { id, deletedAt: null },
      include: { sport: true, host: { include: { profile: true } } },
    });
  }

  create(data: Prisma.MatchCreateInput) {
    return prisma.match.create({ data, include: { sport: true } });
  }

  update(id: string, data: Prisma.MatchUpdateInput) {
    return prisma.match.update({
      where: { id },
      data,
      include: { sport: true, host: { include: { profile: true } } },
    });
  }

  list(where: Prisma.MatchWhereInput, skip: number, take: number) {
    return prisma.match.findMany({
      where: { ...where, deletedAt: null },
      include: { sport: true, host: { include: { profile: true } } },
      skip,
      take,
      orderBy: { startsAt: "asc" },
    });
  }

  count(where: Prisma.MatchWhereInput) {
    return prisma.match.count({ where: { ...where, deletedAt: null } });
  }

  async lockMatch(id: string, tx: Prisma.TransactionClient) {
    return tx.match.findFirstOrThrow({ where: { id, deletedAt: null } });
  }
}
