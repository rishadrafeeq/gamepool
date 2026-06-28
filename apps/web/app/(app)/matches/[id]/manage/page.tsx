"use client";

import { use } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { JoinRequestCard } from "@/components/domain/join-request-card";
import { PlayerPicker } from "@/components/domain/player-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMatchParticipants,
  useJoinRequests,
  useReviewJoinRequest,
  usePublishMatch,
  useCancelMatch,
  useMatchInvites,
  useCreateInvite,
  useMatch,
} from "@/features/matches/hooks/use-matches";
import { useState } from "react";

type Props = { params: Promise<{ id: string }> };

export default function MatchManagePage({ params }: Props) {
  const { id } = use(params);
  const { data: participants, isLoading: loadingRoster } = useMatchParticipants(id);
  const { data: requests } = useJoinRequests(id);
  const { data: invites } = useMatchInvites(id);
  const review = useReviewJoinRequest(id);
  const publish = usePublishMatch(id);
  const cancel = useCancelMatch(id);
  const createInvite = useCreateInvite(id);
  const [inviteeId, setInviteeId] = useState("");
  const { data: match } = useMatch(id);

  if (loadingRoster) return <Skeleton className="m-4 h-40" />;

  return (
    <>
      <PageHeader title="Manage match" backHref={`/matches/${id}`} />
      <div className="space-y-6 p-4">
        <section className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => publish.mutateAsync().then(() => toast.success("Published"))}>
              Publish
            </Button>
            <Button variant="destructive" onClick={() => cancel.mutateAsync().then(() => toast.success("Cancelled"))}>
              Cancel
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">
            Join requests {requests && requests.length > 0 ? `(${requests.length})` : ""}
          </h3>
          <p className="text-xs text-muted-foreground">
            Review who asked to join. Accept adds them to the roster; reject declines the request.
          </p>
          {requests?.length === 0 && <p className="text-sm text-muted-foreground">No pending requests</p>}
          {requests?.map((req) => (
            <JoinRequestCard
              key={req.id}
              request={req}
              busy={review.isPending}
              onAccept={() =>
                review
                  .mutateAsync({ requestId: req.id, action: "APPROVE" })
                  .then(() => toast.success("Player accepted"))
                  .catch(() => toast.error("Could not accept"))
              }
              onReject={() =>
                review
                  .mutateAsync({ requestId: req.id, action: "DECLINE" })
                  .then(() => toast.success("Request rejected"))
                  .catch(() => toast.error("Could not reject"))
              }
            />
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Send invite</h3>
          <PlayerPicker
            value={inviteeId}
            onChange={setInviteeId}
            city={match?.city}
            sportId={match?.sportId}
          />
          <Button
            className="w-full"
            onClick={() =>
              createInvite
                .mutateAsync({ inviteeUserId: inviteeId })
                .then(() => {
                  toast.success("Invite sent");
                  setInviteeId("");
                })
                .catch(() => toast.error("Invite failed"))
            }
            disabled={!inviteeId}
          >
            Send invite
          </Button>
          {invites && invites.length > 0 && (
            <p className="text-xs text-muted-foreground">{invites.length} invite(s) sent</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Roster ({participants?.length ?? 0})</h3>
          {participants?.map((p) => {
            const name = p.user?.profile?.displayName ?? "Player";
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar>
                    <AvatarImage src={p.user?.profile?.avatarUrl ?? undefined} />
                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.role} · {p.status}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </>
  );
}
