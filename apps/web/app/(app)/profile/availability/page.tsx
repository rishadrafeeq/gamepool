"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AvailabilityWindowsEditor,
  type AvailabilityWindow,
} from "@/components/domain/availability-windows-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAvailability, useReplaceAvailability } from "@/features/users/hooks/use-users";

export default function ProfileAvailabilityPage() {
  const { data: existing } = useAvailability();
  const replaceAvailability = useReplaceAvailability();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (existing === undefined) return;
    setWindows(
      existing.length
        ? existing.map((w) => ({
            dayOfWeek: w.dayOfWeek,
            startTime: w.startTime.slice(0, 5),
            endTime: w.endTime.slice(0, 5),
          }))
        : [{ dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "12:00" }],
    );
    setInitialized(true);
  }, [existing, initialized]);

  async function save() {
    try {
      await replaceAvailability.mutateAsync({ windows });
      toast.success("Availability saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  return (
    <>
      <PageHeader title="Availability" backHref="/profile" />
      <div className="space-y-4 p-4">
        <AvailabilityWindowsEditor windows={windows} onChange={setWindows} />
        <Button className="w-full min-h-[44px]" onClick={save} disabled={replaceAvailability.isPending}>
          Save availability
        </Button>
      </div>
    </>
  );
}
