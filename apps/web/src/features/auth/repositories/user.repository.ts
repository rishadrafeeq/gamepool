import type { Prisma, User, UserProfile } from "@gamepool/database";
import { prisma } from "@gamepool/database";

export type UserWithProfile = User & { profile: UserProfile | null };

export class UserRepository {
  findByFirebaseUid(firebaseUid: string) {
    return prisma.user.findFirst({
      where: { firebaseUid, deletedAt: null },
      include: { profile: true, userSports: { where: { deletedAt: null }, include: { sport: true } } },
    });
  }

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        profile: true,
        userSports: { where: { deletedAt: null }, include: { sport: true } },
        availability: true,
      },
    });
  }

  createFromFirebase(input: {
    firebaseUid: string;
    email?: string | null;
    phone?: string | null;
    displayName: string;
    city: string;
    timezone: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firebaseUid: input.firebaseUid,
          email: input.email ?? null,
          phone: input.phone ?? null,
          status: "ACTIVE",
          emailVerifiedAt: input.email ? new Date() : null,
          phoneVerifiedAt: input.phone ? new Date() : null,
          lastLoginAt: new Date(),
        },
      });

      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          displayName: input.displayName,
          city: input.city,
          timezone: input.timezone,
        },
      });

      return { ...user, profile };
    });
  }

  touchLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      include: { profile: true },
    });
  }

  updateProfile(userId: string, data: Prisma.UserProfileUpdateInput) {
    return prisma.userProfile.update({ where: { userId }, data });
  }

  updateStatus(userId: string, status: User["status"]) {
    return prisma.user.update({ where: { id: userId }, data: { status } });
  }

  searchPlayers(params: {
    skip: number;
    take: number;
    sportId?: string;
    skillLevel?: string;
    city?: string;
    area?: string;
    excludeUserIds: string[];
    q?: string;
  }) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        id: { notIn: params.excludeUserIds },
        profile: {
          deletedAt: null,
          ...(params.city ? { city: params.city } : {}),
          ...(params.area ? { area: params.area } : {}),
          ...(params.q
            ? { displayName: { contains: params.q, mode: "insensitive" } }
            : {}),
        },
        ...(params.sportId || params.skillLevel
          ? {
              userSports: {
                some: {
                  deletedAt: null,
                  ...(params.sportId ? { sportId: params.sportId } : {}),
                  ...(params.skillLevel
                    ? { skillLevel: params.skillLevel as never }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: {
        profile: true,
        userSports: { where: { deletedAt: null }, include: { sport: true } },
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  countPlayers(params: {
    sportId?: string;
    skillLevel?: string;
    city?: string;
    area?: string;
    excludeUserIds: string[];
    q?: string;
  }) {
    return prisma.user.count({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        id: { notIn: params.excludeUserIds },
        profile: {
          deletedAt: null,
          ...(params.city ? { city: params.city } : {}),
          ...(params.area ? { area: params.area } : {}),
          ...(params.q
            ? { displayName: { contains: params.q, mode: "insensitive" } }
            : {}),
        },
        ...(params.sportId || params.skillLevel
          ? {
              userSports: {
                some: {
                  deletedAt: null,
                  ...(params.sportId ? { sportId: params.sportId } : {}),
                  ...(params.skillLevel
                    ? { skillLevel: params.skillLevel as never }
                    : {}),
                },
              },
            }
          : {}),
      },
    });
  }
}
