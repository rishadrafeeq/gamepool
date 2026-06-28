"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AvailabilityWindowsEditor,
  type AvailabilityWindow,
} from "@/components/domain/availability-windows-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useReplaceAvailability } from "@/features/users/hooks/use-users";

export default function OnboardingAvailabilityPage() {
  const router = useRouter();
  const replaceAvailability = useReplaceAvailability();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([
    { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "12:00" },
  ]);

  async function finish() {
    try {
      await replaceAvailability.mutateAsync({ windows });
      toast.success("Profile ready!");
      router.push("/home");
    } catch {
      toast.error("Failed to save availability");
    }
  }

  return (
    <>
      <PageHeader title="Availability" backHref="/onboarding/location" />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">When are you usually free to play?</p>
        <AvailabilityWindowsEditor windows={windows} onChange={setWindows} />
        <Button className="w-full min-h-[44px]" onClick={finish} disabled={replaceAvailability.isPending}>
          Finish setup
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => router.push("/home")}>
          Skip for now
        </Button>
      </div>
    </>
  );
}
