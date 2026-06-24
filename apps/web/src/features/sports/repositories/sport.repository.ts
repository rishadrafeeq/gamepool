import { prisma } from "@gamepool/database";

export class SportRepository {
  listActive() {
    return prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  findById(id: string) {
    return prisma.sport.findFirst({ where: { id, isActive: true } });
  }
}
