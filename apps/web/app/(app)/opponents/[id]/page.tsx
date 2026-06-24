"use client";

import { use } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/domain/sport-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpponentRequest, useExpressOpponentInterest } from "@/features/coordination/hooks/use-coordination";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function OpponentDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: me } = useMe();
  const { data: req, isLoading } = useOpponentRequest(id);
  const express = useExpressOpponentInterest(id);

  if (isLoading) return <Skeleton className="m-4 h-40" />;
  if (!req) return null;

  const isOwner = me?.id === req.creatorUserId;

  return (
    <>
      <PageHeader title="Opponent request" backHref="/opponents" />
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-xl font-semibold">{req.title}</h2>
            {req.sport && <SportBadge sport={req.sport} skill={req.skillLevel} />}
            <p className="text-sm text-muted-foreground">
              {req.city} · {req.format}
            </p>
          </CardContent>
        </Card>
        {!isOwner && req.status === "OPEN" && (
          <Button
            className="w-full min-h-[44px]"
            onClick={async () => {
              try {
                await express.mutateAsync();
                toast.success("Interest sent");
              } catch {
                toast.error("Could not express interest");
              }
            }}
            disabled={express.isPending}
          >
            Express interest
          </Button>
        )}
      </div>
    </>
  );
}
