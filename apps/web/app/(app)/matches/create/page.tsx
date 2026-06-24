"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useCreateMatchStore } from "@/stores/create-match-store";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import type { SkillLevel } from "@/types";

export default function CreateMatchStep1Page() {
  const router = useRouter();
  const { draft, setDraft } = useCreateMatchStore();
  const { data: sports } = useSports();

  function next() {
    if (!draft.sportId || !draft.title || !draft.format) {
      toast.error("Fill required fields");
      return;
    }
    router.push("/matches/create/schedule");
  }

  return (
    <>
      <PageHeader title="Create match" backHref="/home" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Step 1 of 3 — Basics</p>
        <div className="space-y-2">
          <Label>Sport</Label>
          <select
            className="flex h-10 w-full rounded-md border px-3 text-sm"
            value={draft.sportId ?? ""}
            onChange={(e) => setDraft({ sportId: e.target.value })}
          >
            <option value="">Select sport</option>
            {sports?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={draft.title ?? ""} onChange={(e) => setDraft({ title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Format</Label>
          <Input value={draft.format ?? ""} onChange={(e) => setDraft({ format: e.target.value })} placeholder="5-a-side, Singles..." />
        </div>
        <div className="space-y-2">
          <Label>Skill level</Label>
          <SkillLevelSelect
            value={(draft.skillLevelExpected ?? "INTERMEDIATE") as SkillLevel}
            onChange={(v) => setDraft({ skillLevelExpected: v })}
          />
        </div>
        <Button className="w-full min-h-[44px]" onClick={next}>
          Next
        </Button>
      </div>
    </>
  );
}
