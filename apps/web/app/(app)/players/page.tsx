"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PlayerCard } from "@/components/domain/player-card";
import { EmptyState } from "@/components/domain/empty-state";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayers } from "@/features/users/hooks/use-users";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useMe } from "@/features/users/hooks/use-me";
import type { SkillLevel } from "@/types";

export default function PlayersPage() {
  const { data: me } = useMe();
  const [city, setCity] = useState(me?.profile?.city ?? "");
  const [sportId, setSportId] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [radiusKm, setRadiusKm] = useState("");
  const { data: sports } = useSports();
  const { data, isLoading } = usePlayers({
    city: city || undefined,
    sportId: sportId || undefined,
    skillLevel: skillLevel ?? undefined,
    radiusKm: radiusKm || undefined,
    page: 1,
    limit: 20,
  });

  return (
    <>
      <PageHeader title="Find Players" backHref="/home" />
      <div className="space-y-4 p-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">Sport</Label>
            <select
              id="sport"
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
          <div className="space-y-2">
            <Label>Skill level</Label>
            <SkillLevelSelect
              value={skillLevel}
              onChange={(v) => setSkillLevel(v)}
              allowAny
            />
            {skillLevel && (
              <button type="button" className="text-xs text-primary" onClick={() => setSkillLevel("")}>
                Clear skill filter
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="radius">Distance (km)</Label>
            <Input
              id="radius"
              type="number"
              min={1}
              max={200}
              placeholder="e.g. 25"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Uses your profile location when coordinates are set during onboarding.
            </p>
          </div>
        </div>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState title="No players found" description="Try different filters or a wider radius." />
        )}
        <div className="space-y-3">
          {data?.items.map((player) => (
            <PlayerCard
              key={player.id}
              userId={player.id}
              profile={
                player.profile ?? {
                  displayName: player.displayName ?? "Player",
                  city: player.city ?? "",
                  area: player.area,
                  avatarUrl: player.avatarUrl,
                }
              }
              sports={player.userSports ?? player.sports}
              distanceKm={player.distanceKm}
            />
          ))}
        </div>
      </div>
    </>
  );
}
