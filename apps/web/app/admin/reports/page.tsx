"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReports } from "@/features/admin/hooks/use-admin";

export default function AdminReportsPage() {
  const [status, setStatus] = useState("OPEN");
  const { data, isLoading } = useAdminReports({ page: 1, limit: 50, status: status || undefined });

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Reports" }]} />
      <h1 className="text-2xl font-semibold">Reports queue</h1>

      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All</option>
        <option value="OPEN">Open</option>
        <option value="UNDER_REVIEW">Under review</option>
        <option value="RESOLVED">Resolved</option>
        <option value="DISMISSED">Dismissed</option>
      </select>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Reason</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Reporter</AdminTh>
              <AdminTh>Created</AdminTh>
              <AdminTh />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((report) => (
              <tr key={report.id}>
                <AdminTd>{report.reason}</AdminTd>
                <AdminTd>
                  <Badge variant="outline">{report.status}</Badge>
                </AdminTd>
                <AdminTd>{report.reporter?.profile?.displayName ?? "—"}</AdminTd>
                <AdminTd>{format(new Date(report.createdAt), "MMM d, yyyy")}</AdminTd>
                <AdminTd>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/reports/${report.id}`}>Review</Link>
                  </Button>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
