"use client";

import { format } from "date-fns";
import { use, useState } from "react";
import { toast } from "sonner";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMatch, useUpdateAdminMatch } from "@/features/admin/hooks/use-admin";
import { canModerate } from "@/features/admin/lib/rbac";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

type Props = { params: Promise<{ id: string }> };

export default function AdminMatchDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: match, isLoading } = useAdminMatch(id);
  const update = useUpdateAdminMatch(id);
  const role = useAdminAuthStore((s) => s.session?.admin.role);
  const [hidden, setHidden] = useState<boolean | null>(null);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!match) return null;

  const isHidden = hidden ?? match.hiddenFromDiscovery;

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Matches", href: "/admin/matches" },
          { label: match.title },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{match.title}</h1>
        <Badge>{match.status}</Badge>
        {isHidden && <Badge variant="secondary">Hidden from discovery</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Sport: {match.sport?.name}</p>
            <p>Host: {match.host?.profile?.displayName}</p>
            <p>When: {format(new Date(match.startsAt), "PPpp")}</p>
            <p>Venue: {match.venueName}, {match.city}</p>
            <p>
              Roster: {match.confirmedCount}/{match.maxParticipants}
            </p>
            <p>Reports: {match._count?.reports ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {match.participants?.map((p) => (
              <p key={p.id}>
                {p.user?.profile?.displayName ?? "Player"} · {p.status}
              </p>
            ))}
            {match.participants?.length === 0 && <p className="text-muted-foreground">No participants</p>}
          </CardContent>
        </Card>
      </div>

      {canModerate(role) && (
        <Card>
          <CardHeader>
            <CardTitle>Moderation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={async () => {
                const next = !isHidden;
                try {
                  await update.mutateAsync({ hiddenFromDiscovery: next });
                  setHidden(next);
                  toast.success(next ? "Match hidden" : "Match visible");
                } catch {
                  toast.error("Update failed");
                }
              }}
            >
              {isHidden ? "Show in discovery" : "Hide from discovery"}
            </Button>
            {match.status !== "CANCELLED" && (
              <Button
                variant="destructive"
                disabled={update.isPending}
                onClick={async () => {
                  try {
                    await update.mutateAsync({ status: "CANCELLED" });
                    toast.success("Match cancelled");
                  } catch {
                    toast.error("Cancel failed");
                  }
                }}
              >
                Cancel match
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
