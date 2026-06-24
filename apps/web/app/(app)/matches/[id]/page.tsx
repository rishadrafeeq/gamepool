"use client";

import Link from "next/link";
import { format } from "date-fns";
import { use } from "react";
import { MapPin, Settings, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { LifecycleBadge } from "@/components/domain/lifecycle-badge";
import { SportBadge } from "@/components/domain/sport-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatch } from "@/features/matches/hooks/use-matches";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function MatchDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: match, isLoading } = useMatch(id);
  const { data: me } = useMe();

  if (isLoading) return <Skeleton className="m-4 h-48" />;
  if (!match) return null;

  const isHost = me?.id === match.hostUserId;
  const isFull = match.status === "FULL";
  const canJoin = ["OPEN", "FULL"].includes(match.status) && !isHost;

  return (
    <>
      <PageHeader
        title="Match"
        backHref="/home"
        action={
          isHost ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/matches/${id}/manage`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-semibold">{match.title}</h2>
              <LifecycleBadge status={match.status} />
            </div>
            {match.sport && <SportBadge sport={match.sport} skill={match.skillLevelExpected} />}
            <p className="text-sm">{format(new Date(match.startsAt), "EEEE, MMM d · h:mm a")}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {match.venueName}, {match.city}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {match.confirmedCount}/{match.maxParticipants} confirmed
            </p>
            {match.notes && <p className="text-sm text-muted-foreground">{match.notes}</p>}
          </CardContent>
        </Card>
        {canJoin && !isFull && (
          <Button asChild className="w-full min-h-[44px]">
            <Link href={`/matches/${id}/join`}>Request to join</Link>
          </Button>
        )}
        {canJoin && isFull && match.waitlistEnabled && (
          <Button asChild variant="secondary" className="w-full min-h-[44px]">
            <Link href={`/matches/${id}/waitlist`}>Join waitlist</Link>
          </Button>
        )}
        <Button variant="outline" asChild className="w-full">
          <Link href={`/matches/${id}/participants`}>View roster</Link>
        </Button>
      </div>
    </>
  );
}
