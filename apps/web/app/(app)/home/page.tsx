"use client";

import Link from "next/link";
import { Plus, Users, Swords, UserPlus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MatchCard } from "@/components/domain/match-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatches } from "@/features/matches/hooks/use-matches";

export default function HomePage() {
  const { data, isLoading } = useMatches({ status: "OPEN" });

  return (
    <>
      <PageHeader
        title="Discover"
        action={
          <Button size="sm" asChild>
            <Link href="/matches/create">
              <Plus className="h-4 w-4" />
              Match
            </Link>
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/players">
              <Users className="mr-2 h-4 w-4" />
              Players
            </Link>
          </Button>
          <Button variant="outline" asChild className="min-h-[44px]">
            <Link href="/teammates">
              <UserPlus className="mr-2 h-4 w-4" />
              Teammates
            </Link>
          </Button>
          <Button variant="outline" asChild className="col-span-2 min-h-[44px]">
            <Link href="/opponents">
              <Swords className="mr-2 h-4 w-4" />
              Opponents
            </Link>
          </Button>
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Open matches
        </h2>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState
            title="No matches yet"
            description="Be the first to create a match in your area."
            actionLabel="Create match"
            onAction={() => (window.location.href = "/matches/create")}
          />
        )}
        <div className="space-y-3">
          {data?.items.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </>
  );
}
