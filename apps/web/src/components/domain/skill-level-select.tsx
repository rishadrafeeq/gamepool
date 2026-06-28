"use client";

import { SKILL_LEVEL_OPTIONS, formatSkill } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SkillLevel } from "@/types";

export function SkillLevelSelect({
  value,
  onChange,
  allowAny = false,
}: {
  value: SkillLevel | "";
  onChange: (v: SkillLevel | "") => void;
  allowAny?: boolean;
}) {
  return (
    <Select
      value={value || (allowAny ? "ANY" : "INTERMEDIATE")}
      onValueChange={(v) => onChange(v === "ANY" ? "" : (v as SkillLevel))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Skill level" />
      </SelectTrigger>
      <SelectContent>
        {allowAny && <SelectItem value="ANY">Any skill level</SelectItem>}
        {SKILL_LEVEL_OPTIONS.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            {level.label}
          </SelectItem>
        ))}
        {value === "ADVANCED" && (
          <SelectItem value="ADVANCED">{formatSkill("ADVANCED")} (legacy)</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
