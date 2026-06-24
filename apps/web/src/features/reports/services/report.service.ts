import type { CreateReportBody } from "@gamepool/shared";

import { ReportRepository } from "@/features/reports/repositories/report.repository";
import { ApiError } from "@/server/errors/api-error";

export class ReportService {
  constructor(private readonly reports = new ReportRepository()) {}

  async create(reporterUserId: string, body: CreateReportBody) {
    if (body.reportedUserId === reporterUserId) {
      throw new ApiError(400, "INVALID_REQUEST", "Cannot report yourself");
    }

    return this.reports.create({
      reporterUserId,
      reportedUserId: body.reportedUserId,
      reportedMatchId: body.reportedMatchId,
      reason: body.reason,
      description: body.description,
    });
  }
}
