import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  DECLINED: "destructive",
};

export function InterestStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STYLES[status] ?? "outline"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
