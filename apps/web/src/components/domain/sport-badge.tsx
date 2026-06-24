import { Badge } from "@/components/ui/badge";
import type { Sport, SkillLevel } from "@/types";

export function SportBadge({
  sport,
  skill,
}: {
  sport: Sport;
  skill?: SkillLevel;
}) {
  return (
    <Badge
      variant="secondary"
      style={sport.color ? { borderColor: sport.color, color: sport.color } : undefined}
    >
      {sport.name}
      {skill ? ` · ${skill}` : ""}
    </Badge>
  );
}
