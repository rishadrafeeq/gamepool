"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useUserSports, useReplaceSports } from "@/features/users/hooks/use-users";
import type { SkillLevel } from "@/types";

export default function ProfileSportsPage() {
  const { data: sports } = useSports();
  const { data: userSports } = useUserSports();
  const replaceSports = useReplaceSports();
  const [selected, setSelected] = useState<Record<string, SkillLevel>>({});

  const merged = { ...Object.fromEntries((userSports ?? []).map((us) => [us.sportId, us.skillLevel])), ...selected };

  function toggle(sportId: string) {
    setSelected((prev) => {
      const next = { ...prev, ...Object.fromEntries((userSports ?? []).map((us) => [us.sportId, us.skillLevel])) };
      if (next[sportId]) delete next[sportId];
      else next[sportId] = "INTERMEDIATE";
      return next;
    });
  }

  async function save() {
    const entries = Object.entries(merged);
    if (entries.length === 0) {
      toast.error("Select at least one sport");
      return;
    }
    try {
      await replaceSports.mutateAsync({
        sports: entries.map(([sportId, skillLevel], i) => ({
          sportId,
          skillLevel,
          isPrimary: i === 0,
        })),
      });
      toast.success("Sports updated");
    } catch {
      toast.error("Failed to update sports");
    }
  }

  return (
    <>
      <PageHeader title="Sports" backHref="/profile" />
      <div className="space-y-4 p-4">
        {sports?.map((sport) => {
          const active = Boolean(merged[sport.id]);
          return (
            <Card key={sport.id} className={active ? "border-primary" : ""}>
              <CardContent className="space-y-3 p-4">
                <button type="button" className="w-full text-left font-medium" onClick={() => toggle(sport.id)}>
                  {sport.name}
                </button>
                {active && (
                  <SkillLevelSelect
                    value={merged[sport.id] ?? "INTERMEDIATE"}
                    onChange={(v) => setSelected((p) => ({ ...p, [sport.id]: v }))}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
        <Button className="w-full min-h-[44px]" onClick={save} disabled={replaceSports.isPending}>
          Save sports
        </Button>
      </div>
    </>
  );
}
