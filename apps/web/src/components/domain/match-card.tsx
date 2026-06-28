"use client";

import Link from "next/link";
import { format } from "date-fns";
import { MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMatchSkill } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { LifecycleBadge } from "@/components/domain/lifecycle-badge";
import type { Match } from "@/types";

export function MatchCard({ match }: { match: Match }) {
  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="transition-colors hover:bg-accent/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold leading-tight">{match.title}</h3>
              {match.sport && <SportBadge sport={match.sport} />}
            </div>
            <LifecycleBadge status={match.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(match.startsAt), "EEE, MMM d · h:mm a")}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {match.city}
              {match.area ? `, ${match.area}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {match.confirmedCount}/{match.maxParticipants}
            </span>
          </div>
          <Badge variant="outline">{formatMatchSkill(match.skillLevelExpected)}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
