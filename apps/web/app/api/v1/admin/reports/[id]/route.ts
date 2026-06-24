import { NextRequest } from "next/server";

import { adminReviewReportSchema } from "@gamepool/shared";

import { AdminService } from "@/features/admin/services/admin.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withAdmin } from "@/server/http/admin-handler";

const service = new AdminService();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withAdmin(request, async ({ adminId }) => {
    const body = await parseBody(request, adminReviewReportSchema);
    return service.reviewReport(adminId, id, body);
  });
}
