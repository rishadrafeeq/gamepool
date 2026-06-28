import type {
  PlayerSearchQuery,
  ReplaceAvailabilityBody,
  ReplaceUserSportsBody,
  UpdateProfileBody,
} from "@gamepool/shared";
import { prisma } from "@gamepool/database";

import { UserRepository } from "@/features/auth/repositories/user.repository";
import { AvailabilityRepository } from "@/features/users/repositories/availability.repository";
import { UserSportRepository } from "@/features/users/repositories/user-sport.repository";
import { connectionPolicy } from "@/server/policies/connection.policy";
import { blockPolicy } from "@/server/policies/block.policy";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";
import { filterByRadius, haversineKm } from "@/lib/geo";

export class UserService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly userSports = new UserSportRepository(),
    private readonly availability = new AvailabilityRepository(),
  ) {}

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found");

    const [matchesHosted, matchesJoined] = await Promise.all([
      prisma.match.count({
        where: { hostUserId: userId, deletedAt: null },
      }),
      prisma.matchParticipant.count({
        where: {
          userId,
          status: "CONFIRMED",
          deletedAt: null,
        },
      }),
    ]);

    return {
      ...user,
      stats: {
        matchesHosted,
        matchesJoined,
        memberSince: user.createdAt,
      },
    };
  }

  async updateProfile(userId: string, body: UpdateProfileBody) {
    await this.getMe(userId);
    return this.users.updateProfile(userId, body);
  }

  async replaceSports(userId: string, body: ReplaceUserSportsBody) {
    await this.getMe(userId);
    return this.userSports.replaceAll(userId, body.sports);
  }

  async listSports(userId: string) {
    return this.userSports.list(userId);
  }

  async replaceAvailability(userId: string, body: ReplaceAvailabilityBody) {
    await this.getMe(userId);
    return this.availability.replaceAll(userId, body.windows);
  }

  async listAvailability(userId: string) {
    return this.availability.list(userId);
  }

  async getPublicProfile(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) return this.getMe(viewerId);

    await blockPolicy.assertNotBlocked(viewerId, targetUserId);

    const user = await this.users.findById(targetUserId);
    if (!user?.profile) throw new ApiError(404, "USER_NOT_FOUND", "User not found");

    if (
      user.profile.profileVisibility === "CONNECTIONS_ONLY" &&
      !(await connectionPolicy.areConnected(viewerId, targetUserId))
    ) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    return user;
  }

  async searchPlayers(viewerId: string, query: PlayerSearchQuery) {
    const blocked = await blockPolicy.getBlockedUserIds(viewerId);
    const exclude = [...blocked, viewerId];
    const { skip, take } = paginate(query.page, query.limit);

    const viewer = await this.users.findById(viewerId);
    const originLat =
      query.latitude ??
      (viewer?.profile?.latitude != null ? Number(viewer.profile.latitude) : undefined);
    const originLng =
      query.longitude ??
      (viewer?.profile?.longitude != null ? Number(viewer.profile.longitude) : undefined);

    const fetchTake = query.radiusKm && originLat != null && originLng != null ? take * 4 : take;

    const [items, total] = await Promise.all([
      this.users.searchPlayers({
        skip,
        take: fetchTake,
        sportId: query.sportId,
        skillLevel: query.skillLevel,
        city: query.city,
        area: query.area,
        excludeUserIds: exclude,
        q: query.q,
      }),
      this.users.countPlayers({
        sportId: query.sportId,
        skillLevel: query.skillLevel,
        city: query.city,
        area: query.area,
        excludeUserIds: exclude,
        q: query.q,
      }),
    ]);

    let filtered = items;
    if (query.radiusKm && originLat != null && originLng != null) {
      const withCoords = items
        .filter((u) => u.profile)
        .map((u) => ({
          user: u,
          latitude: u.profile?.latitude != null ? Number(u.profile.latitude) : null,
          longitude: u.profile?.longitude != null ? Number(u.profile.longitude) : null,
        }));
      const inRadius = filterByRadius(withCoords, { lat: originLat, lng: originLng }, query.radiusKm);
      filtered = inRadius.slice(0, take).map((entry) => entry.user);
    }

    const visible = [];
    for (const user of filtered) {
      if (!user.profile) continue;
      const distanceKm =
        originLat != null &&
        originLng != null &&
        user.profile.latitude != null &&
        user.profile.longitude != null
          ? Math.round(
              haversineKm(
                originLat,
                originLng,
                Number(user.profile.latitude),
                Number(user.profile.longitude),
              ) * 10,
            ) / 10
          : undefined;

      if (
        user.profile.profileVisibility === "CONNECTIONS_ONLY" &&
        !(await connectionPolicy.areConnected(viewerId, user.id))
      ) {
        visible.push({
          id: user.id,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          city: user.profile.city,
          area: user.profile.area,
          sports: user.userSports,
          limited: true,
          distanceKm,
        });
      } else {
        visible.push({
          id: user.id,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          bio: user.profile.bio,
          city: user.profile.city,
          area: user.profile.area,
          sports: user.userSports,
          limited: false,
          distanceKm,
        });
      }
    }

    return {
      items: visible,
      meta: {
        page: query.page,
        limit: query.limit,
        total: query.radiusKm ? visible.length : total,
      },
    };
  }
}
