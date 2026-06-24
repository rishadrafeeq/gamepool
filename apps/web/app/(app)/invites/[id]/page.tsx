"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRespondInvite } from "@/features/matches/hooks/use-matches";
import { useMatchInvites } from "@/features/matches/hooks/use-matches";
import { useMe } from "@/features/users/hooks/use-me";

type Props = { params: Promise<{ id: string }> };

export default function InviteResponsePage({ params }: Props) {
  const { id: matchId } = use(params);
  const router = useRouter();
  const { data: me } = useMe();
  const { data: invites } = useMatchInvites(matchId);
  const respond = useRespondInvite(matchId);

  const myInvite = invites?.find((i) => i.inviteeUserId === me?.id && i.status === "PENDING");

  async function respondTo(action: "ACCEPT" | "DECLINE") {
    if (!myInvite) return;
    try {
      await respond.mutateAsync({ inviteId: myInvite.id, action });
      toast.success(action === "ACCEPT" ? "Invite accepted" : "Invite declined");
      router.push(`/matches/${matchId}`);
    } catch {
      toast.error("Could not respond to invite");
    }
  }

  return (
    <>
      <PageHeader title="Match invite" backHref="/notifications" />
      <div className="space-y-4 p-4">
        {!myInvite ? (
          <p className="text-sm text-muted-foreground">No pending invite found.</p>
        ) : (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="font-medium">You&apos;ve been invited to a match</p>
              {myInvite.message && <p className="text-sm text-muted-foreground">{myInvite.message}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => respondTo("ACCEPT")} disabled={respond.isPending}>
                  Accept
                </Button>
                <Button variant="outline" onClick={() => respondTo("DECLINE")} disabled={respond.isPending}>
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
