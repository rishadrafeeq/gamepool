"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useJoinRequest } from "@/features/matches/hooks/use-matches";
import { useState } from "react";

type Props = { params: Promise<{ id: string }> };

export default function MatchJoinPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const join = useJoinRequest(id);
  const [message, setMessage] = useState("");

  async function submit() {
    try {
      await join.mutateAsync(message || undefined);
      toast.success("Join request sent");
      router.push(`/matches/${id}`);
    } catch {
      toast.error("Could not send join request");
    }
  }

  return (
    <>
      <PageHeader title="Request to join" backHref={`/matches/${id}`} />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Optional message to the host</p>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, I'd like to join..." />
        <Button className="w-full min-h-[44px]" onClick={submit} disabled={join.isPending}>
          Send request
        </Button>
      </div>
    </>
  );
}
