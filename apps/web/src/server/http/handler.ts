import type { NextRequest } from "next/server";

import { UserRepository } from "@/features/auth/repositories/user.repository";
import { ApiError, handleApiError, jsonSuccess, jsonCreated, jsonNoContent } from "@/server/errors/api-error";
import { requireFirebaseUser } from "@/server/auth/verify-firebase-token";

export type AuthContext = {
  userId: string;
  request: NextRequest;
};

export type AdminContext = {
  adminId: string;
  adminRole: string;
  request: NextRequest;
};

async function resolveUserId(): Promise<string> {
  const firebaseUser = await requireFirebaseUser();
  const user = await new UserRepository().findByFirebaseUid(firebaseUser.firebaseUid);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Call POST /api/v1/auth/bootstrap first");
  }

  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Account is suspended");
  }

  if (user.status === "DEACTIVATED" || user.deletedAt) {
    throw new ApiError(403, "ACCOUNT_DEACTIVATED", "Account is deactivated");
  }

  return user.id;
}

export async function withUser<T>(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<T>,
  status: 200 | 201 = 200,
) {
  try {
    const userId = await resolveUserId();
    const data = await handler({ userId, request });
    if (status === 201) return jsonCreated(data);
    return jsonSuccess(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function withUserNoContent(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<void>,
) {
  try {
    const userId = await resolveUserId();
    await handler({ userId, request });
    return jsonNoContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export async function withUserMeta<T>(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<{ data: T; meta: { page: number; limit: number; total: number } }>,
) {
  try {
    const userId = await resolveUserId();
    const result = await handler({ userId, request });
    return jsonSuccess(result.data, undefined, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}
