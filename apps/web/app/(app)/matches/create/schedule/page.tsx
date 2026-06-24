"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateMatchStore } from "@/stores/create-match-store";

export default function CreateMatchSchedulePage() {
  const router = useRouter();
  const { draft, setDraft } = useCreateMatchStore();

  function next() {
    if (!draft.startsAt || !draft.venueName || !draft.city) {
      toast.error("Fill schedule and venue");
      return;
    }
    router.push("/matches/create/details");
  }

  return (
    <>
      <PageHeader title="Schedule & venue" backHref="/matches/create" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Step 2 of 3</p>
        <div className="space-y-2">
          <Label>Starts at</Label>
          <Input
            type="datetime-local"
            value={draft.startsAt?.slice(0, 16) ?? ""}
            onChange={(e) => setDraft({ startsAt: new Date(e.target.value).toISOString() })}
          />
        </div>
        <div className="space-y-2">
          <Label>Venue name</Label>
          <Input value={draft.venueName ?? ""} onChange={(e) => setDraft({ venueName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={draft.city ?? ""} onChange={(e) => setDraft({ city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Area (optional)</Label>
          <Input value={draft.area ?? ""} onChange={(e) => setDraft({ area: e.target.value })} />
        </div>
        <Button className="w-full min-h-[44px]" onClick={next}>
          Next
        </Button>
      </div>
    </>
  );
}
