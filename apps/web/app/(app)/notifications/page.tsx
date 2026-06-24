"use client";

import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationItem } from "@/components/domain/notification-item";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/use-notifications";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications(1);
  const markAll = useMarkAllNotificationsRead();

  return (
    <>
      <PageHeader
        title="Notifications"
        backHref="/home"
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              markAll.mutateAsync().then(() => toast.success("All marked read"))
            }
          >
            Read all
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {isLoading && <Skeleton className="h-20 w-full" />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState title="No notifications" description="You're all caught up." />
        )}
        {data?.items.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </>
  );
}
