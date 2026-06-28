import type { AdminRole } from "@/features/admin/types";

const ROLE_RANK: Record<AdminRole, number> = {
  SUPPORT: 1,
  MODERATOR: 2,
  SUPER_ADMIN: 3,
};

export function canModerate(role: AdminRole | undefined): boolean {
  return role ? ROLE_RANK[role] >= ROLE_RANK.MODERATOR : false;
}

export function canSuperAdmin(role: AdminRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}
