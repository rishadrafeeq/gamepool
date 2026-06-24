import { ApiError } from "@/server/errors/api-error";
import { prisma } from "@gamepool/database";

export class BlockPolicy {
  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: userA, blockedUserId: userB },
          { blockerUserId: userB, blockedUserId: userA },
        ],
      },
    });
    return Boolean(block);
  }

  async assertNotBlocked(userA: string, userB: string): Promise<void> {
    if (await this.isBlocked(userA, userB)) {
      throw new ApiError(403, "BLOCKED", "Action not allowed due to block");
    }
  }

  async getBlockedUserIds(viewerId: string): Promise<string[]> {
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerUserId: viewerId }, { blockedUserId: viewerId }],
      },
      select: { blockerUserId: true, blockedUserId: true },
    });

    const ids = new Set<string>();
    for (const b of blocks) {
      ids.add(b.blockerUserId === viewerId ? b.blockedUserId : b.blockerUserId);
    }
    return [...ids];
  }
}

export const blockPolicy = new BlockPolicy();
