"use client";

import { use, useState } from "react";
import { toast } from "sonner";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUser, useReinstateUser, useSuspendUser } from "@/features/admin/hooks/use-admin";
import { canModerate, canSuperAdmin } from "@/features/admin/lib/rbac";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

type Props = { params: Promise<{ id: string }> };

export default function AdminUserDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: user, isLoading } = useAdminUser(id);
  const suspend = useSuspendUser();
  const reinstate = useReinstateUser();
  const role = useAdminAuthStore((s) => s.session?.admin.role);
  const [reason, setReason] = useState("");

  if (isLoading) return <Skeleton className="h-64" />;
  if (!user) return null;

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.profile?.displayName ?? "User" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{user.profile?.displayName}</h1>
        <Badge variant={user.status === "SUSPENDED" ? "destructive" : "secondary"}>{user.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {user.email ?? "—"}</p>
            <p>Phone: {user.phone ?? "—"}</p>
            <p>City: {user.profile?.city ?? "—"}</p>
            <p>Area: {user.profile?.area ?? "—"}</p>
            <p>Joined: {new Date(user.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Hosted matches: {user._count?.hostedMatches ?? 0}</p>
            <p>Participations: {user._count?.matchParticipations ?? 0}</p>
            <p>Reports filed: {user._count?.reportsFiled ?? 0}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {user.userSports?.map((us) => (
                <Badge key={us.id} variant="outline">
                  {us.sport.name} · {us.skillLevel}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {canModerate(role) && user.status === "ACTIVE" && (
        <Card>
          <CardHeader>
            <CardTitle>Suspend user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button
              variant="destructive"
              disabled={suspend.isPending}
              onClick={async () => {
                try {
                  await suspend.mutateAsync({ userId: id, reason });
                  toast.success("User suspended");
                } catch {
                  toast.error("Suspend failed");
                }
              }}
            >
              Suspend
            </Button>
          </CardContent>
        </Card>
      )}

      {canSuperAdmin(role) && user.status === "SUSPENDED" && (
        <Button
          disabled={reinstate.isPending}
          onClick={async () => {
            try {
              await reinstate.mutateAsync(id);
              toast.success("User reinstated");
            } catch {
              toast.error("Reinstate failed");
            }
          }}
        >
          Reinstate user
        </Button>
      )}
    </div>
  );
}
