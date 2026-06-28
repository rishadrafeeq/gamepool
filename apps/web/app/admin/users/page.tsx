"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsers } from "@/features/admin/hooks/use-admin";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminUsers({ page: 1, limit: 50, q: search || undefined, status: status || undefined });

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Users" }]} />
      <h1 className="text-2xl font-semibold">Users</h1>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search name, email, phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
        />
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <Button onClick={() => setSearch(q)}>Search</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Name</AdminTh>
              <AdminTh>Email</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>City</AdminTh>
              <AdminTh />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((user) => (
              <tr key={user.id}>
                <AdminTd>{user.profile?.displayName ?? "—"}</AdminTd>
                <AdminTd>{user.email ?? user.phone ?? "—"}</AdminTd>
                <AdminTd>
                  <Badge variant={user.status === "SUSPENDED" ? "destructive" : "secondary"}>{user.status}</Badge>
                </AdminTd>
                <AdminTd>{user.profile?.city ?? "—"}</AdminTd>
                <AdminTd>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/users/${user.id}`}>View</Link>
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
