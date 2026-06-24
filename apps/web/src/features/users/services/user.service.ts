import type {
  PlayerSearchQuery,
  ReplaceAvailabilityBody,
  ReplaceUserSportsBody,
  UpdateProfileBody,
} from "@gamepool/shared";

import { UserRepository } from "@/features/auth/repositories/user.repository";
import { AvailabilityRepository } from "@/features/users/repositories/availability.repository";
import { UserSportRepository } from "@/features/users/repositories/user-sport.repository";
import { connectionPolicy } from "@/server/policies/connection.policy";
import { blockPolicy } from "@/server/policies/block.policy";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class UserService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly userSports = new UserSportRepository(),
    private readonly availability = new AvailabilityRepository(),
  ) {}

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    return user;
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

    const [items, total] = await Promise.all([
      this.users.searchPlayers({
        skip,
        take,
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

    const visible = [];
    for (const user of items) {
      if (!user.profile) continue;
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
        });
      }
    }

    return { items: visible, meta: { page: query.page, limit: query.limit, total } };
  }
}
