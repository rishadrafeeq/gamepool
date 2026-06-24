"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Connection } from "@/types";

type ConnectionRequestCardProps = {
  connection: Connection;
  currentUserId: string;
  onRespond: (action: "ACCEPT" | "DECLINE") => void;
  isPending?: boolean;
};

export function ConnectionRequestCard({
  connection,
  currentUserId,
  onRespond,
  isPending,
}: ConnectionRequestCardProps) {
  const isRecipient = connection.recipientUserId === currentUserId;
  const other =
    isRecipient ? connection.requester : connection.recipient;
  const profile = other?.profile;
  const name = profile?.displayName ?? "Player";

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar>
          <AvatarImage src={profile?.avatarUrl ?? undefined} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {isRecipient ? "Wants to connect" : "Request sent"}
          </p>
        </div>
        {isRecipient && connection.status === "PENDING" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onRespond("ACCEPT")} disabled={isPending}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => onRespond("DECLINE")} disabled={isPending}>
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
