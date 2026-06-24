"use client";

import { SKILL_LEVELS } from "@/lib/constants";
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
}: {
  value: SkillLevel;
  onChange: (v: SkillLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SkillLevel)}>
      <SelectTrigger>
        <SelectValue placeholder="Skill level" />
      </SelectTrigger>
      <SelectContent>
        {SKILL_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {level.charAt(0) + level.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
