import { Badge } from "@/components/ui/badge";
import { formatMatchSkill } from "@/lib/constants";
import type { Sport, SkillLevel } from "@/types";

export function SportBadge({
  sport,
  skill,
}: {
  sport: Sport;
  skill?: SkillLevel | null;
}) {
  const skillLabel = skill === undefined ? "" : ` · ${formatMatchSkill(skill)}`;
  return (
    <Badge
      variant="secondary"
      style={sport.color ? { borderColor: sport.color, color: sport.color } : undefined}
    >
      {sport.name}
      {skill !== undefined ? skillLabel : ""}
    </Badge>
  );
}
