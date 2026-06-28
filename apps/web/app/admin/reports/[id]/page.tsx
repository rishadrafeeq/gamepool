"use client";

import { format } from "date-fns";
import { use, useState } from "react";
import { toast } from "sonner";

import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReport, useReviewReport } from "@/features/admin/hooks/use-admin";
import { canModerate } from "@/features/admin/lib/rbac";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

type Props = { params: Promise<{ id: string }> };

export default function AdminReportDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: report, isLoading } = useAdminReport(id);
  const review = useReviewReport(id);
  const role = useAdminAuthStore((s) => s.session?.admin.role);
  const [notes, setNotes] = useState("");

  if (isLoading) return <Skeleton className="h-64" />;
  if (!report) return null;

  async function submit(status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED") {
    try {
      await review.mutateAsync({ status, resolutionNotes: notes || undefined });
      toast.success(`Report ${status.toLowerCase().replace("_", " ")}`);
    } catch {
      toast.error("Review failed");
    }
  }

  return (
    <div className="space-y-4">
      <AdminBreadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Reports", href: "/admin/reports" },
          { label: report.reason },
        ]}
      />
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Report review</h1>
        <Badge>{report.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Reason: {report.reason}</p>
          <p>Reporter: {report.reporter?.profile?.displayName ?? "—"}</p>
          <p>Reported user: {report.reportedUser?.profile?.displayName ?? "—"}</p>
          <p>Reported match: {report.reportedMatch?.title ?? "—"}</p>
          <p>Filed: {format(new Date(report.createdAt), "PPpp")}</p>
          {report.description && <p className="pt-2 text-muted-foreground">{report.description}</p>}
        </CardContent>
      </Card>

      {canModerate(role) && !["RESOLVED", "DISMISSED"].includes(report.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {report.status === "OPEN" && (
                <Button variant="outline" disabled={review.isPending} onClick={() => submit("UNDER_REVIEW")}>
                  Mark under review
                </Button>
              )}
              <Button disabled={review.isPending} onClick={() => submit("RESOLVED")}>
                Resolve
              </Button>
              <Button variant="destructive" disabled={review.isPending} onClick={() => submit("DISMISSED")}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
