import bcrypt from "bcryptjs";
import type { AdminLoginBody } from "@gamepool/shared";

import { AdminRepository } from "@/features/admin/repositories/admin.repository";
import { ReportRepository } from "@/features/reports/repositories/report.repository";
import { MatchRepository } from "@/features/matches/repositories/match.repository";
import { UserRepository } from "@/features/auth/repositories/user.repository";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { signAdminToken } from "@/server/auth/admin-jwt";
import { auditService } from "@/server/audit/audit.service";
import { ApiError } from "@/server/errors/api-error";
import { paginate } from "@/server/utils/serialize";

export class AdminService {
  constructor(
    private readonly admin = new AdminRepository(),
    private readonly reports = new ReportRepository(),
    private readonly matches = new MatchRepository(),
    private readonly users = new UserRepository(),
    private readonly notifications = new NotificationService(),
  ) {}

  async login(body: AdminLoginBody) {
    const admin = await this.admin.findByEmail(body.email);
    if (!admin || admin.status !== "ACTIVE") {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");
    }

    const valid = await bcrypt.compare(body.password, admin.passwordHash);
    if (!valid) throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");

    await this.admin.touchLogin(admin.id);

    const token = await signAdminToken({
      sub: admin.id,
      role: admin.role,
      email: admin.email,
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      },
    };
  }

  async dashboardSummary() {
    const [newUsersToday, activeMatches, pendingReports, wap, fillRate] = await Promise.all([
      this.admin.countUsersToday(),
      this.admin.countActiveMatches(),
      this.admin.countPendingReports(),
      this.admin.weeklyActivePlayers(),
      this.admin.matchFillRate7d(),
    ]);

    return { newUsersToday, activeMatches, pendingReports, wap, fillRate };
  }

  async sportsDistribution() {
    const groups = await this.admin.sportsDistribution();
    return groups.map((g) => ({ sportId: g.sportId, count: g._count._all }));
  }

  async topLocations() {
    const groups = await this.admin.topLocations();
    return groups.map((g) => ({
      city: g.city,
      area: g.area,
      count: g._count._all,
    }));
  }

  async listUsers(page: number, limit: number, q?: string, status?: string) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.admin.listUsers(skip, take, q, status),
      this.admin.countUsers(q, status),
    ]);
    return { items, meta: { page, limit, total } };
  }

  async suspendUser(adminId: string, userId: string, reason?: string | null) {
    await this.users.updateStatus(userId, "SUSPENDED");
    await auditService.log({
      adminUserId: adminId,
      action: "USER_SUSPENDED",
      entityType: "USER",
      entityId: userId,
      metadata: { reason },
    });
    return { suspended: true };
  }

  async reinstateUser(adminId: string, userId: string) {
    await this.users.updateStatus(userId, "ACTIVE");
    await auditService.log({
      adminUserId: adminId,
      action: "USER_REINSTATED",
      entityType: "USER",
      entityId: userId,
    });
    return { reinstated: true };
  }

  async listMatches(
    page: number,
    limit: number,
    filters: { sportId?: string; status?: string; hostUserId?: string },
  ) {
    const { skip, take } = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.admin.listMatches(skip, take, filters),
      this.admin.countMatches(filters),
    ]);
    return { items, meta: { page, limit, total } };
  }

  async updateMatch(
    adminId: string,
    matchId: string,
    data: { status?: string; hiddenFromDiscovery?: boolean },
  ) {
    const updated = await this.matches.update(matchId, {
      ...(data.status ? { status: data.status as never } : {}),
      ...(data.hiddenFromDiscovery !== undefined
        ? { hiddenFromDiscovery: data.hiddenFromDiscovery }
        : {}),
    });

    await auditService.log({
      adminUserId: adminId,
      action: "MATCH_UPDATED",
      entityType: "MATCH",
      entityId: matchId,
      metadata: data,
    });

    return updated;
  }

  async listReports(page: number, limit: number, status?: string) {
    const { skip, take } = paginate(page, limit);
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      this.reports.list(where, skip, take),
      this.reports.count(where),
    ]);
    return { items, meta: { page, limit, total } };
  }

  async reviewReport(
    adminId: string,
    reportId: string,
    data: { status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED"; resolutionNotes?: string | null },
  ) {
    const report = await this.reports.findById(reportId);
    if (!report) throw new ApiError(404, "NOT_FOUND", "Report not found");

    const updated = await this.reports.update(reportId, {
      status: data.status,
      resolutionNotes: data.resolutionNotes,
      reviewedBy: { connect: { id: adminId } },
      reviewedAt: new Date(),
    });

    await auditService.log({
      adminUserId: adminId,
      action: "REPORT_REVIEWED",
      entityType: "REPORT",
      entityId: reportId,
      metadata: data,
    });

    await this.notifications.notify({
      userId: report.reporterUserId,
      type: "REPORT_STATUS_UPDATED",
      title: "Report updated",
      body: `Your report status is now ${data.status}`,
      entityType: "REPORT",
      entityId: reportId,
    });

    return updated;
  }
}
