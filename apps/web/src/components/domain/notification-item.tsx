"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

export function NotificationItem({ notification }: { notification: Notification }) {
  const href =
    notification.entityType === "MATCH" && notification.entityId
      ? `/matches/${notification.entityId}`
      : notification.entityType === "SPORTS_CONNECTION"
        ? "/connections"
        : "#";

  return (
    <Link href={href}>
      <Card className={cn(!notification.readAt && "border-primary/40 bg-primary/5")}>
        <CardContent className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{notification.title}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{notification.body}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
