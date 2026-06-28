"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { JoinRequest } from "@/types";

export function JoinRequestCard({
  request,
  onAccept,
  onReject,
  busy,
}: {
  request: JoinRequest;
  onAccept: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  const name = request.user?.profile?.displayName ?? "Player";
  const userId = request.user?.id ?? request.userId;

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarImage src={request.user?.profile?.avatarUrl ?? undefined} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link href={`/players/${userId}`} className="font-medium text-primary hover:underline">
              {name}
            </Link>
            {request.message && (
              <p className="mt-1 text-sm text-muted-foreground">&ldquo;{request.message}&rdquo;</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onAccept} disabled={busy}>
            Accept
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onReject} disabled={busy}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
