"use client";

import Link from "next/link";
import { format } from "date-fns";
import { use, useState } from "react";
import { MapPin, Settings, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { LifecycleBadge } from "@/components/domain/lifecycle-badge";
import { SportBadge } from "@/components/domain/sport-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatch, useLeaveMatch } from "@/features/matches/hooks/use-matches";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function MatchDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: match, isLoading } = useMatch(id);
  const { data: me } = useMe();
  const leave = useLeaveMatch(id);
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (isLoading) return <Skeleton className="m-4 h-48" />;
  if (!match) return null;

  const isHost = me?.id === match.hostUserId;
  const isFull = match.status === "FULL";
  const canJoin = ["OPEN", "FULL"].includes(match.status) && !isHost;
  const myParticipant = match.roster?.find(
    (p) => p.userId === me?.id && ["CONFIRMED", "WAITLIST", "PENDING"].includes(p.status),
  );
  const canLeave =
    myParticipant &&
    !isHost &&
    !["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(match.status);

  async function confirmLeave() {
    try {
      await leave.mutateAsync();
      toast.success("You left the match");
      setLeaveOpen(false);
      router.push("/my-games");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not leave match");
    }
  }

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
        {canLeave && (
          <Button variant="destructive" className="w-full min-h-[44px]" onClick={() => setLeaveOpen(true)}>
            Leave match
          </Button>
        )}
        <Button variant="outline" asChild className="w-full">
          <Link href={`/matches/${id}/participants`}>View roster</Link>
        </Button>
      </div>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this match?</DialogTitle>
            <DialogDescription>
              You may not be able to rejoin if the match fills up. Leaving may be restricted close to start time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLeave} disabled={leave.isPending}>
              {leave.isPending ? "Leaving..." : "Leave match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
