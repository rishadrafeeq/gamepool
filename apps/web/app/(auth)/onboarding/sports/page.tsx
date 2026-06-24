"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkillLevelSelect } from "@/components/domain/skill-level-select";
import { useSports } from "@/features/sports/hooks/use-sports";
import { useReplaceSports } from "@/features/users/hooks/use-users";
import type { SkillLevel } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingSportsPage() {
  const router = useRouter();
  const { data: sports, isLoading } = useSports();
  const replaceSports = useReplaceSports();
  const [selected, setSelected] = useState<Record<string, SkillLevel>>({});

  function toggle(sportId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[sportId]) delete next[sportId];
      else next[sportId] = "INTERMEDIATE";
      return next;
    });
  }

  async function continueNext() {
    const entries = Object.entries(selected);
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
      router.push("/onboarding/location");
    } catch {
      toast.error("Failed to save sports");
    }
  }

  return (
    <>
      <PageHeader title="Your sports" backHref="/welcome" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Select sports you play and your skill level.</p>
        {isLoading && <Skeleton className="h-24 w-full" />}
        <div className="space-y-3">
          {sports?.map((sport) => {
            const active = Boolean(selected[sport.id]);
            return (
              <Card key={sport.id} className={active ? "border-primary" : ""}>
                <CardContent className="space-y-3 p-4">
                  <button type="button" className="w-full text-left font-medium" onClick={() => toggle(sport.id)}>
                    {sport.name}
                  </button>
                  {active && (
                    <SkillLevelSelect
                      value={selected[sport.id] ?? "INTERMEDIATE"}
                      onChange={(v) => setSelected((p) => ({ ...p, [sport.id]: v }))}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Button className="w-full min-h-[44px]" onClick={continueNext} disabled={replaceSports.isPending}>
          Continue
        </Button>
        <Button variant="ghost" asChild className="w-full">
          <Link href="/onboarding/location">Skip for now</Link>
        </Button>
      </div>
    </>
  );
}
