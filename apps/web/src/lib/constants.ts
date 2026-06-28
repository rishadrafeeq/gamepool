export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "PROFESSIONAL"] as const;

/** Shown in UI only — legacy profiles/matches may still use ADVANCED in the database */
export const SKILL_LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "PROFESSIONAL", label: "Professional" },
] as const;

export const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public", description: "Anyone can discover" },
  { value: "CONNECTIONS_ONLY", label: "Connections", description: "Sports connections only" },
  { value: "INVITE_ONLY", label: "Invite only", description: "Direct invites only" },
] as const;

export function formatSkill(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export function formatMatchSkill(level: string | null | undefined) {
  if (!level) return "Any skill level";
  return formatSkill(level);
}

export function formatDay(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}
