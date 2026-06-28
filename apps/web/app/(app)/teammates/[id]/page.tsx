"use client";

import { use } from "react";
import { toast } from "sonner";

import { InterestStatusBadge } from "@/components/domain/interest-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTeammateRequest,
  useExpressTeammateInterest,
  useReviewTeammateInterest,
} from "@/features/coordination/hooks/use-coordination";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function TeammateDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: me } = useMe();
  const { data: req, isLoading, refetch } = useTeammateRequest(id);
  const express = useExpressTeammateInterest(id);
  const review = useReviewTeammateInterest(id);

  if (isLoading) return <Skeleton className="m-4 h-40" />;
  if (!req) return null;

  const isOwner = me?.id === req.creatorUserId;
  const pendingInterests = req.interests?.filter((i) => i.status === "PENDING") ?? [];

  async function handleReview(interestId: string, action: "APPROVE" | "DECLINE") {
    try {
      await review.mutateAsync({ interestId, action });
      toast.success(action === "APPROVE" ? "Teammate approved" : "Interest declined");
      await refetch();
    } catch {
      toast.error("Could not update interest");
    }
  }

  return (
    <>
      <PageHeader title="Teammate request" backHref="/teammates" />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{req.title}</h2>
              <InterestStatusBadge status={req.status} />
            </div>
            {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
            {req.sport && <SportBadge sport={req.sport} skill={req.skillLevel} />}
            <p className="text-sm">
              {req.city} · {req.requiredPlayers} players needed
            </p>
          </CardContent>
        </Card>

        {isOwner && (
          <section className="space-y-2">
            <h3 className="font-semibold">Interested players</h3>
            {pendingInterests.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending interests yet</p>
            )}
            {req.interests?.map((interest) => {
              const name = interest.user?.profile?.displayName ?? "Player";
              return (
                <Card key={interest.id}>
                  <CardContent className="flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={interest.user?.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        <InterestStatusBadge status={interest.status} />
                      </div>
                    </div>
                    {interest.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReview(interest.id, "APPROVE")} disabled={review.isPending}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(interest.id, "DECLINE")}
                          disabled={review.isPending}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {!isOwner && req.status === "OPEN" && (
          <Button
            className="w-full min-h-[44px]"
            onClick={async () => {
              try {
                await express.mutateAsync();
                toast.success("Interest sent");
                await refetch();
              } catch {
                toast.error("Could not express interest");
              }
            }}
            disabled={express.isPending}
          >
            I&apos;m interested
          </Button>
        )}
      </div>
    </>
  );
}
