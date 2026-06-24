import { NextRequest } from "next/server";

import { AdminService } from "@/features/admin/services/admin.service";
import { requireParam } from "@/server/http/parse";
import { withAdmin } from "@/server/http/admin-handler";

const service = new AdminService();

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  requireParam(id, "id");
  return withAdmin(request, ({ adminId }) => service.reinstateUser(adminId, id));
}
