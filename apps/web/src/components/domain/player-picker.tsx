"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlayers } from "@/features/users/hooks/use-users";
import { cn } from "@/lib/utils";
import type { PlayerSearchResult } from "@/types";

type PlayerPickerProps = {
  value: string;
  onChange: (userId: string) => void;
  city?: string;
  sportId?: string;
};

export function PlayerPicker({ value, onChange, city, sportId }: PlayerPickerProps) {
  const [q, setQ] = useState("");
  const { data, isLoading } = usePlayers({
    page: 1,
    limit: 10,
    q: q || undefined,
    city: city || undefined,
    sportId: sportId || undefined,
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="player-search">Search players</Label>
        <Input
          id="player-search"
          placeholder="Search by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {isLoading && <Skeleton className="h-20 w-full" />}
      <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
        {data?.items.map((player: PlayerSearchResult) => {
          const id = player.id;
          const name = player.profile?.displayName ?? player.displayName ?? "Player";
          const selected = value === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted",
                  selected && "bg-primary/10 ring-1 ring-primary",
                )}
                onClick={() => onChange(id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.profile?.avatarUrl ?? player.avatarUrl ?? undefined} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[player.profile?.city ?? player.city, player.profile?.area ?? player.area]
                      .filter(Boolean)
                      .join(", ")}
                    {player.distanceKm != null ? ` · ${player.distanceKm} km` : ""}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
        {!isLoading && data?.items.length === 0 && (
          <li className="py-4 text-center text-sm text-muted-foreground">No players found</li>
        )}
      </ul>
    </div>
  );
}
