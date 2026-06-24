import type { AdminRole } from "@gamepool/database";
import { headers } from "next/headers";

import { verifyAdminToken } from "@/server/auth/admin-jwt";
import { ApiError } from "@/server/errors/api-error";

export async function requireAdmin(roles?: AdminRole[]) {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing admin Authorization header");
  }

  const token = authorization.slice(7).trim();
  const payload = await verifyAdminToken(token);

  if (roles && !roles.includes(payload.role as AdminRole)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient admin permissions");
  }

  return {
    adminId: payload.sub,
    role: payload.role as AdminRole,
    email: payload.email,
  };
}
