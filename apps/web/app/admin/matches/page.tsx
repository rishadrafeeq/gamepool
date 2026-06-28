"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMatches } from "@/features/admin/hooks/use-admin";

export default function AdminMatchesPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useAdminMatches({ page: 1, limit: 50, status: status || undefined });

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Matches" }]} />
      <h1 className="text-2xl font-semibold">Matches</h1>

      <select
        className="h-10 rounded-md border bg-background px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="FULL">Full</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Title</AdminTh>
              <AdminTh>Sport</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Starts</AdminTh>
              <AdminTh>Roster</AdminTh>
              <AdminTh />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((match) => (
              <tr key={match.id}>
                <AdminTd>{match.title}</AdminTd>
                <AdminTd>{match.sport?.name ?? "—"}</AdminTd>
                <AdminTd>
                  <Badge variant="outline">{match.status}</Badge>
                  {match.hiddenFromDiscovery && (
                    <Badge className="ml-1" variant="secondary">
                      Hidden
                    </Badge>
                  )}
                </AdminTd>
                <AdminTd>{format(new Date(match.startsAt), "MMM d, h:mm a")}</AdminTd>
                <AdminTd>
                  {match.confirmedCount}/{match.maxParticipants}
                </AdminTd>
                <AdminTd>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/matches/${match.id}`}>View</Link>
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
