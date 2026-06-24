import { NextRequest } from "next/server";

import { adminListUsersSchema } from "@gamepool/shared";

import { AdminService } from "@/features/admin/services/admin.service";
import { parseQuery } from "@/server/http/parse";
import { handleApiError, jsonSuccess } from "@/server/errors/api-error";
import { requireAdmin } from "@/server/auth/require-admin";

const service = new AdminService();

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const query = parseQuery(request, adminListUsersSchema);
    const result = await service.listUsers(query.page, query.limit, query.q, query.status);
    return jsonSuccess(result.items, undefined, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}
