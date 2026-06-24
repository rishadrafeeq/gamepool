"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useJoinWaitlist } from "@/features/matches/hooks/use-matches";

type Props = { params: Promise<{ id: string }> };

export default function MatchWaitlistPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const waitlist = useJoinWaitlist(id);

  async function join() {
    try {
      await waitlist.mutateAsync();
      toast.success("Added to waitlist");
      router.push(`/matches/${id}`);
    } catch {
      toast.error("Could not join waitlist");
    }
  }

  return (
    <>
      <PageHeader title="Waitlist" backHref={`/matches/${id}`} />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          This match is full. Join the waitlist to be promoted when a spot opens.
        </p>
        <Button className="w-full min-h-[44px]" onClick={join} disabled={waitlist.isPending}>
          Join waitlist
        </Button>
      </div>
    </>
  );
}
