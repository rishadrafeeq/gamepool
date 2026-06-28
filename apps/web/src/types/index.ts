export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";
export type MatchStatus = "DRAFT" | "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MatchVisibility = "PUBLIC" | "CONNECTIONS_ONLY" | "INVITE_ONLY";
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type UserProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  city: string;
  area?: string | null;
  profileVisibility: "PUBLIC" | "CONNECTIONS_ONLY";
  timezone: string;
};

export type UserSport = {
  id: string;
  sportId: string;
  skillLevel: SkillLevel;
  isPrimary: boolean;
  sport: Sport;
};

export type AvailabilityWindow = {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type PlayerSearchResult = {
  id: string;
  displayName?: string;
  avatarUrl?: string | null;
  city?: string;
  area?: string | null;
  bio?: string;
  sports?: UserSport[];
  userSports?: UserSport[];
  limited?: boolean;
  distanceKm?: number;
  profile?: UserProfile | null;
};

export type User = {
  id: string;
  firebaseUid: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  profile: UserProfile | null;
  userSports?: UserSport[];
  availability?: AvailabilityWindow[];
  createdAt?: string;
  stats?: {
    matchesHosted: number;
    matchesJoined: number;
    memberSince: string;
  };
};

export type Sport = {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  color?: string | null;
  isActive: boolean;
};

export type Match = {
  id: string;
  hostUserId: string;
  sportId: string;
  title: string;
  format: string;
  notes?: string | null;
  status: MatchStatus;
  visibility: MatchVisibility;
  skillLevelExpected?: SkillLevel | null;
  startsAt: string;
  endsAt?: string | null;
  venueName: string;
  venueAddress?: string | null;
  city: string;
  area?: string | null;
  maxParticipants: number;
  confirmedCount: number;
  waitlistEnabled: boolean;
  requiresJoinApproval: boolean;
  sport?: Sport;
  host?: { id: string; profile: UserProfile | null };
  roster?: MatchParticipant[];
};

export type MatchParticipant = {
  id: string;
  matchId: string;
  userId: string;
  role: "HOST" | "PARTICIPANT";
  status: "PENDING" | "CONFIRMED" | "WAITLIST" | "LEFT" | "REMOVED";
  user?: { id: string; profile: UserProfile | null };
};

export type Connection = {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  requester?: { id: string; profile: UserProfile | null };
  recipient?: { id: string; profile: UserProfile | null };
  createdAt: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

export type TeammateRequest = {
  id: string;
  creatorUserId: string;
  sportId: string;
  title: string;
  description?: string | null;
  requiredPlayers: number;
  skillLevel: SkillLevel;
  city: string;
  area?: string | null;
  status: "OPEN" | "CLOSED" | "EXPIRED";
  sport?: Sport;
  creator?: { id: string; profile: UserProfile | null };
  interests?: TeammateInterest[];
};

export type TeammateInterest = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  user?: { id: string; profile: UserProfile | null };
};

export type OpponentRequest = {
  id: string;
  creatorUserId: string;
  sportId: string;
  title: string;
  format: string;
  skillLevel: SkillLevel;
  city: string;
  area?: string | null;
  status: "OPEN" | "MATCHED" | "CLOSED" | "EXPIRED";
  sport?: Sport;
  creator?: { id: string; profile: UserProfile | null };
  interests?: OpponentInterest[];
};

export type OpponentInterest = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  user?: { id: string; profile: UserProfile | null };
};

export type JoinRequest = {
  id: string;
  matchId: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  message?: string | null;
  user?: { id: string; profile: UserProfile | null };
};

export type MatchInvite = {
  id: string;
  matchId: string;
  inviterUserId: string;
  inviteeUserId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  message?: string | null;
  match?: Match;
  inviter?: { id: string; profile: UserProfile | null };
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
};
