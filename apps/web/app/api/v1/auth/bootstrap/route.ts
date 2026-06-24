import { bootstrapBodySchema } from "@gamepool/shared";
import { NextRequest } from "next/server";

import { AuthService } from "@/features/auth/services/auth.service";
import {
  handleApiError,
  jsonSuccess,
} from "@/server/errors/api-error";
import { requireFirebaseUser } from "@/server/auth/verify-firebase-token";

export async function POST(request: NextRequest) {
  try {
    const firebaseUser = await requireFirebaseUser();
    const body = bootstrapBodySchema.parse(await request.json().catch(() => ({})));

    const authService = new AuthService();
    const user = await authService.bootstrap(firebaseUser, body);

    return jsonSuccess({
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        phone: user.phone,
        status: user.status,
        profile: user.profile
          ? {
              id: user.profile.id,
              displayName: user.profile.displayName,
              avatarUrl: user.profile.avatarUrl,
              city: user.profile.city,
              area: user.profile.area,
              profileVisibility: user.profile.profileVisibility,
              timezone: user.profile.timezone,
            }
          : null,
      },
      isNewUser:
        user.createdAt.getTime() === user.updatedAt.getTime() &&
        user.lastLoginAt?.getTime() === user.createdAt.getTime(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
