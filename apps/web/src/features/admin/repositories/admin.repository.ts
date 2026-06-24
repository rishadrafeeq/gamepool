import { prisma } from "@gamepool/database";

export class AdminRepository {
  findByEmail(email: string) {
    return prisma.adminUser.findUnique({ where: { email } });
  }

  touchLogin(id: string) {
    return prisma.adminUser.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  countUsersToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return prisma.user.count({ where: { createdAt: { gte: start }, deletedAt: null } });
  }

  countActiveMatches() {
    return prisma.match.count({
      where: { deletedAt: null, status: { in: ["OPEN", "FULL", "IN_PROGRESS"] } },
    });
  }

  countPendingReports() {
    return prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  }

  async weeklyActivePlayers() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const participants = await prisma.matchParticipant.findMany({
      where: { joinedAt: { gte: since }, status: "CONFIRMED", deletedAt: null },
      select: { userId: true },
      distinct: ["userId"],
    });
    const hosts = await prisma.match.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { hostUserId: true },
      distinct: ["hostUserId"],
    });
    const ids = new Set([...participants.map((p) => p.userId), ...hosts.map((h) => h.hostUserId)]);
    return ids.size;
  }

  async matchFillRate7d() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const matches = await prisma.match.findMany({
      where: { startsAt: { gte: since }, deletedAt: null, status: { in: ["OPEN", "FULL", "IN_PROGRESS", "COMPLETED"] } },
      select: { confirmedCount: true, maxParticipants: true },
    });
    if (matches.length === 0) return 0;
    const rate =
      matches.reduce((sum, m) => sum + m.confirmedCount / m.maxParticipants, 0) / matches.length;
    return Math.round(rate * 10000) / 100;
  }

  sportsDistribution() {
    return prisma.match.groupBy({
      by: ["sportId"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  }

  topLocations(limit = 10) {
    return prisma.match.groupBy({
      by: ["city", "area"],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: limit,
    });
  }

  listUsers(skip: number, take: number, q?: string, status?: string) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { profile: { displayName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { profile: true },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  countUsers(q?: string, status?: string) {
    return prisma.user.count({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { profile: { displayName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
    });
  }

  listMatches(skip: number, take: number, filters: { sportId?: string; status?: string; hostUserId?: string }) {
    return prisma.match.findMany({
      where: {
        deletedAt: null,
        ...(filters.sportId ? { sportId: filters.sportId } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.hostUserId ? { hostUserId: filters.hostUserId } : {}),
      },
      include: { sport: true, host: { include: { profile: true } } },
      skip,
      take,
      orderBy: { startsAt: "desc" },
    });
  }

  countMatches(filters: { sportId?: string; status?: string; hostUserId?: string }) {
    return prisma.match.count({
      where: {
        deletedAt: null,
        ...(filters.sportId ? { sportId: filters.sportId } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.hostUserId ? { hostUserId: filters.hostUserId } : {}),
      },
    });
  }
}
