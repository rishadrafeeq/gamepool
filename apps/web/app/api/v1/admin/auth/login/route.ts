import { NextRequest } from "next/server";

import { adminLoginSchema } from "@gamepool/shared";

import { AdminService } from "@/features/admin/services/admin.service";
import { parseBody } from "@/server/http/parse";
import { handleApiError, jsonSuccess } from "@/server/errors/api-error";

const service = new AdminService();

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, adminLoginSchema);
    const result = await service.login(body);
    return jsonSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
