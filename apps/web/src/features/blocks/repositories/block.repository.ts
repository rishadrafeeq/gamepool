import { prisma } from "@gamepool/database";

export class BlockRepository {
  create(blockerUserId: string, blockedUserId: string) {
    return prisma.userBlock.create({ data: { blockerUserId, blockedUserId } });
  }

  delete(blockerUserId: string, blockedUserId: string) {
    return prisma.userBlock.deleteMany({ where: { blockerUserId, blockedUserId } });
  }

  exists(blockerUserId: string, blockedUserId: string) {
    return prisma.userBlock.findUnique({
      where: { blockerUserId_blockedUserId: { blockerUserId, blockedUserId } },
    });
  }
}
