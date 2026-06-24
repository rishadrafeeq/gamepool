"use client";

import { use } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
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
} from "@/features/matches/hooks/use-matches";
import { Input } from "@/components/ui/input";
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
          <h3 className="font-semibold">Join requests</h3>
          {requests?.length === 0 && <p className="text-sm text-muted-foreground">No pending requests</p>}
          {requests?.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm">{req.user?.profile?.displayName ?? "Player"}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      review.mutateAsync({ requestId: req.id, action: "APPROVE" }).then(() => toast.success("Approved"))
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      review.mutateAsync({ requestId: req.id, action: "DECLINE" }).then(() => toast.success("Declined"))
                    }
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Send invite</h3>
          <Input placeholder="Invitee user ID" value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} />
          <Button
            className="w-full"
            onClick={() =>
              createInvite
                .mutateAsync({ inviteeUserId: inviteeId })
                .then(() => toast.success("Invite sent"))
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
          <h3 className="font-semibold">Roster</h3>
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
                    <p className="text-xs text-muted-foreground">{p.status}</p>
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
