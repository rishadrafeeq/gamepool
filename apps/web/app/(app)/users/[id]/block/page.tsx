"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useBlockUser } from "@/features/safety/hooks/use-safety";

type Props = { params: Promise<{ id: string }> };

export default function BlockUserPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const block = useBlockUser();

  async function confirm() {
    try {
      await block.mutateAsync(id);
      toast.success("User blocked");
      router.push("/players");
    } catch {
      toast.error("Could not block user");
    }
  }

  return (
    <>
      <PageHeader title="Block user" backHref={`/players/${id}`} />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Blocked users cannot interact with you on GamePool. You can unblock them later from settings.
        </p>
        <Button variant="destructive" className="w-full min-h-[44px]" onClick={confirm} disabled={block.isPending}>
          Confirm block
        </Button>
      </div>
    </>
  );
}
