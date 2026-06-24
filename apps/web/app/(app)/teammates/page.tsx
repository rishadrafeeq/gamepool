"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { EmptyState } from "@/components/domain/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeammateRequests } from "@/features/coordination/hooks/use-coordination";

export default function TeammatesPage() {
  const [city, setCity] = useState("");
  const { data, isLoading } = useTeammateRequests(city ? { city } : {});

  return (
    <>
      <PageHeader
        title="Find Teammates"
        backHref="/home"
        action={
          <Button size="sm" asChild>
            <Link href="/teammates/create">Post</Link>
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && data?.length === 0 && (
          <EmptyState title="No teammate requests" description="Post one to find players." />
        )}
        <div className="space-y-3">
          {data?.map((req) => (
            <Link key={req.id} href={`/teammates/${req.id}`}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="font-semibold">{req.title}</p>
                  {req.sport && <SportBadge sport={req.sport} skill={req.skillLevel} />}
                  <p className="text-sm text-muted-foreground">
                    {req.city} · Needs {req.requiredPlayers} players
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
