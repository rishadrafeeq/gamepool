"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StatCard } from "@/components/admin/stat-card";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary, useRecentActivity } from "@/features/admin/hooks/use-admin";

export default function AdminDashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useRecentActivity();

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs items={[{ label: "Dashboard" }]} />
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total users" value={summary?.totalUsers ?? 0} />
          <StatCard label="New users today" value={summary?.newUsersToday ?? 0} />
          <StatCard label="Active matches" value={summary?.activeMatches ?? 0} />
          <StatCard label="Pending reports" value={summary?.pendingReports ?? 0} />
          <StatCard label="Suspended users" value={summary?.suspendedUsers ?? 0} />
          <StatCard label="Weekly active players" value={summary?.wap ?? 0} hint={`Fill rate ${summary?.fillRate ?? 0}%`} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {loadingActivity ? (
          <Skeleton className="h-48" />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Action</AdminTh>
                <AdminTh>Entity</AdminTh>
                <AdminTh>Admin</AdminTh>
                <AdminTh>When</AdminTh>
              </tr>
            </thead>
            <tbody>
              {activity?.map((event) => (
                <tr key={event.id}>
                  <AdminTd>
                    <Badge variant="outline">{event.action}</Badge>
                  </AdminTd>
                  <AdminTd>
                    {event.entityType === "USER" && (
                      <Link href={`/admin/users/${event.entityId}`} className="text-primary hover:underline">
                        User
                      </Link>
                    )}
                    {event.entityType === "MATCH" && (
                      <Link href={`/admin/matches/${event.entityId}`} className="text-primary hover:underline">
                        Match
                      </Link>
                    )}
                    {event.entityType === "REPORT" && (
                      <Link href={`/admin/reports/${event.entityId}`} className="text-primary hover:underline">
                        Report
                      </Link>
                    )}
                    {!["USER", "MATCH", "REPORT"].includes(event.entityType) && event.entityType}
                  </AdminTd>
                  <AdminTd>{event.adminUser.displayName}</AdminTd>
                  <AdminTd>{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</AdminTd>
                </tr>
              ))}
              {activity?.length === 0 && (
                <tr>
                  <td colSpan={4} className="border-b px-4 py-6 text-center text-muted-foreground">
                    No recent activity
                  </td>
                </tr>
              )}
            </tbody>
          </AdminTable>
        )}
      </section>
    </div>
  );
}
