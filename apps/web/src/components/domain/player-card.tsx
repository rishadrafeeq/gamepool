import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import type { User, UserProfile } from "@/types";

type PlayerCardProps = {
  userId: string;
  profile: UserProfile | null;
  sports?: User["userSports"];
};

export function PlayerCard({ userId, profile, sports }: PlayerCardProps) {
  const name = profile?.displayName ?? "Player";
  const initials = name.slice(0, 2).toUpperCase();
  const primary = sports?.find((s) => s.isPrimary) ?? sports?.[0];

  return (
    <Link href={`/players/${userId}`}>
      <Card className="transition-colors hover:bg-accent/30">
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar>
            <AvatarImage src={profile?.avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[profile?.city, profile?.area].filter(Boolean).join(", ")}
            </p>
            {primary?.sport && (
              <div className="mt-2">
                <SportBadge sport={primary.sport} skill={primary.skillLevel} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
