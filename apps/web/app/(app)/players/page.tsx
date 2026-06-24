"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PlayerCard } from "@/components/domain/player-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayers } from "@/features/users/hooks/use-users";
import { useSports } from "@/features/sports/hooks/use-sports";

export default function PlayersPage() {
  const [city, setCity] = useState("");
  const [sportId, setSportId] = useState("");
  const { data: sports } = useSports();
  const { data, isLoading } = usePlayers({ city, sportId, page: 1, limit: 20 });

  return (
    <>
      <PageHeader title="Find Players" backHref="/home" />
      <div className="space-y-4 p-4">
        <div className="grid gap-2">
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
          >
            <option value="">All sports</option>
            {sports?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState title="No players found" description="Try different filters." />
        )}
        <div className="space-y-3">
          {data?.items.map((user) => (
            <PlayerCard
              key={user.id}
              userId={user.id}
              profile={user.profile}
              sports={user.userSports}
            />
          ))}
        </div>
      </div>
    </>
  );
}
