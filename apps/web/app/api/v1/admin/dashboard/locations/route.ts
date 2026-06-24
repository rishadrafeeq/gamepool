import { NextRequest } from "next/server";

import { AdminService } from "@/features/admin/services/admin.service";
import { withAdmin } from "@/server/http/admin-handler";

const service = new AdminService();

export async function GET(request: NextRequest) {
  return withAdmin(request, () => service.topLocations());
}
