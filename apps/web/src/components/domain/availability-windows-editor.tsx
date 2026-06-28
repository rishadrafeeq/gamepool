"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS } from "@/lib/constants";
import type { DayOfWeek } from "@/types";

export type AvailabilityWindow = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

type Props = {
  windows: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
};

export function AvailabilityWindowsEditor({ windows, onChange }: Props) {
  function updateWindow(index: number, patch: Partial<AvailabilityWindow>) {
    const next = [...windows];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function removeWindow(index: number) {
    onChange(windows.filter((_, i) => i !== index));
  }

  function addWindow() {
    onChange([...windows, { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "12:00" }]);
  }

  return (
    <div className="space-y-4">
      {windows.length === 0 && (
        <p className="text-sm text-muted-foreground">No availability windows yet. Add one below.</p>
      )}
      {windows.map((w, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Window {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={() => removeWindow(i)}
              aria-label="Remove availability window"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove
            </Button>
          </div>
          <div>
            <Label>Day</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={w.dayOfWeek}
              onChange={(e) => updateWindow(i, { dayOfWeek: e.target.value as DayOfWeek })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={w.startTime}
                onChange={(e) => updateWindow(i, { startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={w.endTime}
                onChange={(e) => updateWindow(i, { endTime: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addWindow} className="w-full">
        Add window
      </Button>
    </div>
  );
}
