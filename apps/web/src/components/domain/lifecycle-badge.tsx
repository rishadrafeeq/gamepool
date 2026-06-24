import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/types";

const labels: Record<MatchStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  FULL: "Full",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const variants: Record<MatchStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  OPEN: "default",
  FULL: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export function LifecycleBadge({ status }: { status: MatchStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
