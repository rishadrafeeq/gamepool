import { createReportSchema } from "@gamepool/shared";

import { ReportService } from "@/features/reports/services/report.service";
import { parseBody } from "@/server/http/parse";
import { withUser } from "@/server/http/handler";

const service = new ReportService();

export async function POST(request: Request) {
  return withUser(request as never, async ({ userId }) => {
    const body = await parseBody(request as never, createReportSchema);
    return service.create(userId, body);
  }, 201);
}
