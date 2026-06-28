import { NextRequest } from "next/server";

import { adminUpdateMatchSchema } from "@gamepool/shared";

import { AdminService } from "@/features/admin/services/admin.service";
import { parseBody, requireParam } from "@/server/http/parse";
import { withAdmin } from "@/server/http/admin-handler";

const service = new AdminService();

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withAdmin(request, () => service.getMatch(id));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withAdmin(
    request,
    async ({ adminId }) => {
      const body = await parseBody(request, adminUpdateMatchSchema);
      return service.updateMatch(adminId, id, body);
    },
    ["MODERATOR", "SUPER_ADMIN"],
  );
}
