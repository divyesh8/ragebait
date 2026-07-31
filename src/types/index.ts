export interface UserProfile {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  aura: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  totalBattles: number;
  followers: number;
  following: number;
  achievements: string[];
  joinedGroups: string[];
  createdAt: string;
}

export type BattleType =
  | "casual"
  | "ranked"
  | "friend"
  | "tournament"
  | "group"
  | "event";

export type BattleMode = "text" | "image" | "meme";

export type BattleStatus = "live" | "scheduled" | "completed";

export interface Battle {
  id: string;
  title: string;
  topic: string;
  type: BattleType;
  mode: BattleMode;
  status: BattleStatus;
  participants: {
    id: string;
    userId: string;
    username: string;
    avatarUrl: string;
  }[];
  aiScore?: AIJudgeScore;
  winnerId?: string;
  viewerCount: number;
  startsAt: string;
}

export interface AIJudgeScore {
  humor: number;
  creativity: number;
  originality: number;
  topicRelevance: number;
  timing: number;
  comebackQuality: number;
  confidence: number;
  wordplay: number;
  consistency: number;
  total: number;
}

export interface AuraTransaction {
  id: string;
  reason: string;
  amount: number;
  timestamp: string;
}

export interface RageGroup {
  id: string;
  name: string;
  description: string;
  bannerUrl: string;
  memberCount: number;
  topics: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string;
  aura: number;
  wins: number;
  winRate: number;
  trend: "up" | "down" | "neutral";
}
