export type AdminRole = "SUPER_ADMIN" | "MODERATOR" | "SUPPORT";

export type AdminSession = {
  token: string;
  admin: {
    id: string;
    email: string;
    displayName: string;
    role: AdminRole;
  };
};

export type DashboardSummary = {
  totalUsers: number;
  newUsersToday: number;
  activeMatches: number;
  pendingReports: number;
  suspendedUsers: number;
  wap: number;
  fillRate: number;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  adminUser: { email: string; displayName: string };
};

export type AdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  profile: {
    displayName: string;
    city: string;
    area?: string | null;
    avatarUrl?: string | null;
  } | null;
  userSports?: Array<{
    id: string;
    skillLevel: string;
    sport: { name: string };
  }>;
  _count?: {
    hostedMatches: number;
    matchParticipations: number;
    reportsFiled: number;
  };
};

export type AdminMatch = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  city: string;
  area?: string | null;
  venueName: string;
  startsAt: string;
  confirmedCount: number;
  maxParticipants: number;
  hiddenFromDiscovery: boolean;
  hostUserId: string;
  sport?: { name: string };
  host?: { profile: { displayName: string } | null };
  participants?: Array<{
    id: string;
    status: string;
    user?: { profile: { displayName: string } | null };
  }>;
  _count?: { reports: number };
};

export type AdminReport = {
  id: string;
  reason: string;
  description?: string | null;
  status: string;
  resolutionNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reporter?: { profile: { displayName: string } | null };
  reportedUser?: { id: string; profile: { displayName: string } | null } | null;
  reportedMatch?: { id: string; title: string } | null;
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
};
