import type { NextRequest } from "next/server";
import type { AdminRole } from "@gamepool/database";

import { requireAdmin } from "@/server/auth/require-admin";
import { handleApiError, jsonSuccess } from "@/server/errors/api-error";

export type AdminHandlerContext = {
  adminId: string;
  adminRole: AdminRole;
  request: NextRequest;
};

export async function withAdmin<T>(
  request: NextRequest,
  handler: (ctx: AdminHandlerContext) => Promise<T>,
  roles?: AdminRole[],
) {
  try {
    const admin = await requireAdmin(roles);
    const data = await handler({
      adminId: admin.adminId,
      adminRole: admin.role,
      request,
    });
    return jsonSuccess(data);
  } catch (err) {
    return handleApiError(err);
  }
}
