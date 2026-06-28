"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VISIBILITY_OPTIONS } from "@/lib/constants";
import { useCreateMatch } from "@/features/matches/hooks/use-matches";
import { useCreateMatchStore } from "@/stores/create-match-store";
import type { Match, MatchVisibility } from "@/types";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

export default function CreateMatchDetailsPage() {
  const router = useRouter();
  const { draft, setDraft, reset } = useCreateMatchStore();
  const createMatch = useCreateMatch();

  async function submit(publishNow: boolean) {
    if (!draft.sportId || !draft.title || !draft.format || !draft.startsAt || !draft.venueName || !draft.city) {
      toast.error("Complete all steps");
      return;
    }
    try {
      const res = await createMatch.mutateAsync({
        sportId: draft.sportId,
        title: draft.title,
        format: draft.format,
        notes: draft.notes,
        visibility: draft.visibility ?? "PUBLIC",
        skillLevelExpected: draft.skillLevelExpected ?? null,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        durationMinutes: draft.durationMinutes,
        venueName: draft.venueName,
        venueAddress: draft.venueAddress,
        city: draft.city,
        area: draft.area,
        maxParticipants: draft.maxParticipants ?? 10,
        waitlistEnabled: draft.waitlistEnabled ?? true,
        leaveCutoffHours: draft.leaveCutoffHours ?? 2,
        requiresJoinApproval: draft.requiresJoinApproval ?? true,
      });
      const matchId = (res.data as Match).id;
      if (publishNow) {
        await apiFetch(`/api/v1/matches/${matchId}/publish`, { method: "POST" });
      }
      reset();
      toast.success(publishNow ? "Match published" : "Match saved as draft");
      router.push(`/matches/${matchId}`);
    } catch {
      toast.error("Failed to create match");
    }
  }

  return (
    <>
      <PageHeader title="Match details" backHref="/matches/create/schedule" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Step 3 of 3</p>
        <div className="space-y-2">
          <Label>Max participants</Label>
          <Input
            type="number"
            value={draft.maxParticipants ?? 10}
            onChange={(e) => setDraft({ maxParticipants: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Visibility</Label>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "w-full rounded-md border p-3 text-left",
                  draft.visibility === opt.value && "border-primary bg-primary/5",
                )}
                onClick={() => setDraft({ visibility: opt.value as MatchVisibility })}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.waitlistEnabled ?? true}
            onChange={(e) => setDraft({ waitlistEnabled: e.target.checked })}
          />
          Enable waitlist
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.requiresJoinApproval ?? true}
            onChange={(e) => setDraft({ requiresJoinApproval: e.target.checked })}
          />
          Require host approval to join
        </label>
        <div className="grid gap-2">
          <Button className="min-h-[44px]" onClick={() => submit(true)} disabled={createMatch.isPending}>
            Publish match
          </Button>
          <Button variant="outline" className="min-h-[44px]" onClick={() => submit(false)} disabled={createMatch.isPending}>
            Save as draft
          </Button>
        </div>
      </div>
    </>
  );
}
