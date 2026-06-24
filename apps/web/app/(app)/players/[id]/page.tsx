"use client";

import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/features/users/hooks/use-users";
import { useSendConnection } from "@/features/connections/hooks/use-connections";

type Props = { params: Promise<{ id: string }> };

export default function PlayerDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: user, isLoading } = useUser(id);
  const sendConnection = useSendConnection();

  if (isLoading) return <Skeleton className="m-4 h-40 w-auto" />;
  if (!user) return null;

  const name = user.profile?.displayName ?? "Player";

  return (
    <>
      <PageHeader title={name} backHref="/players" />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile?.avatarUrl ?? undefined} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">
                {[user.profile?.city, user.profile?.area].filter(Boolean).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          {user.userSports?.map((us) => (
            <SportBadge key={us.id} sport={us.sport} skill={us.skillLevel} />
          ))}
        </div>
        <Button
          className="w-full min-h-[44px]"
          onClick={async () => {
            try {
              await sendConnection.mutateAsync(id);
              toast.success("Connection request sent");
            } catch {
              toast.error("Could not send request");
            }
          }}
          disabled={sendConnection.isPending}
        >
          Connect
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link href={`/users/${id}/report`}>Report</Link>
          </Button>
          <Button variant="destructive" asChild>
            <Link href={`/users/${id}/block`}>Block</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
