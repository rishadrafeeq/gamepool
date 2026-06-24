import type { DayOfWeek } from "@gamepool/database";
import { prisma } from "@gamepool/database";

import { parseTimeToDate } from "@/server/utils/serialize";

export class AvailabilityRepository {
  replaceAll(
    userId: string,
    windows: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.userAvailability.deleteMany({ where: { userId } });

      if (windows.length === 0) return [];

      await tx.userAvailability.createMany({
        data: windows.map((w) => ({
          userId,
          dayOfWeek: w.dayOfWeek,
          startTime: parseTimeToDate(w.startTime),
          endTime: parseTimeToDate(w.endTime),
        })),
      });

      return tx.userAvailability.findMany({ where: { userId } });
    });
  }

  list(userId: string) {
    return prisma.userAvailability.findMany({ where: { userId } });
  }
}
