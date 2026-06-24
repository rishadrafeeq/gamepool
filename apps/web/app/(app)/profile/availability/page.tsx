"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAvailability, useReplaceAvailability } from "@/features/users/hooks/use-users";
import { DAYS } from "@/lib/constants";
import type { DayOfWeek } from "@/types";

type Window = { dayOfWeek: DayOfWeek; startTime: string; endTime: string };

export default function ProfileAvailabilityPage() {
  const { data: existing } = useAvailability();
  const replaceAvailability = useReplaceAvailability();
  const [windows, setWindows] = useState<Window[]>([]);

  useEffect(() => {
    if (existing?.length) {
      setWindows(
        existing.map((w) => ({
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime.slice(0, 5),
          endTime: w.endTime.slice(0, 5),
        })),
      );
    } else if (windows.length === 0) {
      setWindows([{ dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "12:00" }]);
    }
  }, [existing, windows.length]);

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
        {windows.map((w, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Label>Day</Label>
              <select
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={w.dayOfWeek}
                onChange={(e) => {
                  const next = [...windows];
                  next[i] = { dayOfWeek: e.target.value as DayOfWeek, startTime: w.startTime, endTime: w.endTime };
                  setWindows(next);
                }}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={w.startTime}
                onChange={(e) => {
                  const next = [...windows];
                  next[i] = { dayOfWeek: w.dayOfWeek, startTime: e.target.value, endTime: w.endTime };
                  setWindows(next);
                }}
              />
            </div>
            <div className="col-span-2">
              <Label>End</Label>
              <Input
                type="time"
                value={w.endTime}
                onChange={(e) => {
                  const next = [...windows];
                  next[i] = { dayOfWeek: w.dayOfWeek, startTime: w.startTime, endTime: e.target.value };
                  setWindows(next);
                }}
              />
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => setWindows((w) => [...w, { dayOfWeek: "SUNDAY", startTime: "09:00", endTime: "12:00" }])}>
          Add window
        </Button>
        <Button className="w-full min-h-[44px]" onClick={save} disabled={replaceAvailability.isPending}>
          Save availability
        </Button>
      </div>
    </>
  );
}
