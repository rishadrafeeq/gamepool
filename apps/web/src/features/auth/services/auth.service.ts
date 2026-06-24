import type { BootstrapBody } from "@gamepool/shared";

import type { AuthenticatedRequestUser } from "@/server/auth/verify-firebase-token";
import {
  UserRepository,
  type UserWithProfile,
} from "@/features/auth/repositories/user.repository";
import { ApiError } from "@/server/errors/api-error";

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  async bootstrap(
    firebaseUser: AuthenticatedRequestUser,
    body: BootstrapBody,
  ): Promise<UserWithProfile> {
    const existing = await this.users.findByFirebaseUid(firebaseUser.firebaseUid);

    if (existing) {
      const updated = await this.users.touchLogin(existing.id);
      return updated as UserWithProfile;
    }

    const displayName =
      body.displayName ??
      firebaseUser.email?.split("@")[0] ??
      "Player";

    const city = body.city ?? "Unknown";
    const timezone = body.timezone ?? "UTC";

    if (!firebaseUser.email && !firebaseUser.phone) {
      throw new ApiError(
        400,
        "IDENTITY_REQUIRED",
        "Firebase account must include email or phone",
      );
    }

    return this.users.createFromFirebase({
      firebaseUid: firebaseUser.firebaseUid,
      email: firebaseUser.email ?? null,
      phone: firebaseUser.phone ?? null,
      displayName,
      city,
      timezone,
    });
  }

  async getMe(userId: string): Promise<UserWithProfile> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    return user as UserWithProfile;
  }
}
