import type { Prisma, ReportReason } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class ReportRepository {
  create(data: {
    reporterUserId: string;
    reportedUserId?: string | null;
    reportedMatchId?: string | null;
    reason: ReportReason;
    description?: string | null;
  }) {
    return prisma.report.create({ data });
  }

  findById(id: string) {
    return prisma.report.findUnique({
      where: { id },
      include: { reporter: { include: { profile: true } }, reportedUser: { include: { profile: true } }, reportedMatch: true },
    });
  }

  list(where: Prisma.ReportWhereInput, skip: number, take: number) {
    return prisma.report.findMany({
      where,
      include: { reporter: { include: { profile: true } }, reportedUser: { include: { profile: true } }, reportedMatch: true },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  count(where: Prisma.ReportWhereInput) {
    return prisma.report.count({ where });
  }

  update(id: string, data: Prisma.ReportUpdateInput) {
    return prisma.report.update({ where: { id }, data });
  }
}
