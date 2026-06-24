"use client";

import { MatchCard } from "@/components/domain/match-card";
import { EmptyState } from "@/components/domain/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatches } from "@/features/matches/hooks/use-matches";
import { useMe } from "@/features/users/hooks/use-me";

export default function MyGamesPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useMatches(
    me?.id ? { hostUserId: me.id, page: 1, limit: 50 } : { page: 1, limit: 50 },
  );

  const myMatches =
    data?.items.filter(
      (m) =>
        m.hostUserId === me?.id ||
        m.roster?.some((p) => p.userId === me?.id && ["CONFIRMED", "WAITLIST"].includes(p.status)),
    ) ?? data?.items;

  return (
    <>
      <PageHeader title="My Games" backHref="/home" />
      <div className="space-y-4 p-4">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        )}
        {!isLoading && myMatches?.length === 0 && (
          <EmptyState title="No games yet" description="Join or host a match to see it here." />
        )}
        <div className="space-y-3">
          {myMatches?.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </>
  );
}
