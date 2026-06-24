"use client";

import { use } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatchParticipants } from "@/features/matches/hooks/use-matches";

type Props = { params: Promise<{ id: string }> };

export default function MatchParticipantsPage({ params }: Props) {
  const { id } = use(params);
  const { data: participants, isLoading } = useMatchParticipants(id);

  return (
    <>
      <PageHeader title="Roster" backHref={`/matches/${id}`} />
      <div className="space-y-3 p-4">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {participants?.map((p) => {
          const name = p.user?.profile?.displayName ?? "Player";
          return (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Avatar>
                  <AvatarImage src={p.user?.profile?.avatarUrl ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.role} · {p.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
