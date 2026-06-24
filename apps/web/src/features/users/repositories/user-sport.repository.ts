import type { SkillLevel } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export class UserSportRepository {
  replaceAll(userId: string, sports: { sportId: string; skillLevel: SkillLevel; isPrimary?: boolean }[]) {
    return prisma.$transaction(async (tx) => {
      await tx.userSport.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      for (const sport of sports) {
        const existing = await tx.userSport.findFirst({
          where: { userId, sportId: sport.sportId },
        });

        if (existing) {
          await tx.userSport.update({
            where: { id: existing.id },
            data: {
              skillLevel: sport.skillLevel,
              isPrimary: sport.isPrimary ?? false,
              deletedAt: null,
            },
          });
        } else {
          await tx.userSport.create({
            data: {
              userId,
              sportId: sport.sportId,
              skillLevel: sport.skillLevel,
              isPrimary: sport.isPrimary ?? false,
            },
          });
        }
      }

      return tx.userSport.findMany({
        where: { userId, deletedAt: null },
        include: { sport: true },
      });
    });
  }

  list(userId: string) {
    return prisma.userSport.findMany({
      where: { userId, deletedAt: null },
      include: { sport: true },
    });
  }
}
