import {
  AuraTransaction,
  Battle,
  LeaderboardEntry,
  RageGroup,
  UserProfile,
} from "@/types";

export const mockUser: UserProfile = {
  id: "u_001",
  userId: "2024000001",
  username: "VoidRoaster",
  avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=VoidRoaster",
  bannerUrl: "",
  bio: "Topic specialist: Android vs iPhone. Undefeated in tournament finals since Season 3.",
  aura: 12500,
  level: 42,
  xp: 8200,
  wins: 450,
  losses: 100,
  winRate: 81,
  currentStreak: 7,
  bestStreak: 21,
  totalBattles: 550,
  followers: 3120,
  following: 184,
  achievements: ["First Victory", "500 Wins", "Aura Lord", "Tournament Champion"],
  joinedGroups: ["Android vs iPhone HQ", "Anime Debate Arena"],
  createdAt: "2024-02-11",
};

export const mockBattles: Battle[] = [
  {
    id: "b_001",
    title: "iOS Loyalist vs Android Purist",
    topic: "Android vs iPhone",
    type: "ranked",
    mode: "text",
    status: "live",
    participants: [
      { id: "u_001", userId: "2024000001", username: "VoidRoaster", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=VoidRoaster" },
      { id: "u_002", userId: "2024000002", username: "AppleAuraFarm", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=AppleAuraFarm" },
    ],
    viewerCount: 1842,
    startsAt: "2026-06-14T10:30:00Z",
  },
  {
    id: "b_002",
    title: "Anime Power Scaling Showdown",
    topic: "Anime",
    type: "tournament",
    mode: "meme",
    status: "live",
    participants: [
      { id: "u_003", userId: "2024000003", username: "ShonenSlander", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=ShonenSlander" },
      { id: "u_004", userId: "2024000004", username: "IsekaiInsulter", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=IsekaiInsulter" },
    ],
    viewerCount: 956,
    startsAt: "2026-06-14T11:00:00Z",
  },
  {
    id: "b_003",
    title: "College Life: Hostel vs Day Scholar",
    topic: "College Life",
    type: "casual",
    mode: "text",
    status: "scheduled",
    participants: [
      { id: "u_005", userId: "2024000005", username: "HostelHazard", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=HostelHazard" },
      { id: "u_006", userId: "2024000006", username: "DayScholarDrip", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=DayScholarDrip" },
    ],
    viewerCount: 0,
    startsAt: "2026-06-14T18:00:00Z",
  },
  {
    id: "b_004",
    title: "Cricket Captaincy Roast Royale",
    topic: "Cricket",
    type: "group",
    mode: "text",
    status: "completed",
    participants: [
      { id: "u_007", userId: "2024000007", username: "PitchProphet", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=PitchProphet" },
      { id: "u_008", userId: "2024000008", username: "BoundaryBully", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=BoundaryBully" },
    ],
    aiScore: {
      humor: 25,
      creativity: 20,
      originality: 19,
      topicRelevance: 20,
      timing: 14,
      comebackQuality: 18,
      confidence: 17,
      wordplay: 19,
      consistency: 16,
      total: 92,
    },
    winnerId: "u_007",
    viewerCount: 2310,
    startsAt: "2026-06-13T20:00:00Z",
  },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: "2024000001", username: "VoidRoaster", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=VoidRoaster", aura: 12500, wins: 450, winRate: 81, trend: "up" },
  { rank: 2, userId: "2024000007", username: "PitchProphet", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=PitchProphet", aura: 11820, wins: 410, winRate: 78, trend: "up" },
  { rank: 3, userId: "2024000003", username: "ShonenSlander", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=ShonenSlander", aura: 10990, wins: 395, winRate: 76, trend: "down" },
  { rank: 4, userId: "2024000002", username: "AppleAuraFarm", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=AppleAuraFarm", aura: 9870, wins: 350, winRate: 74, trend: "neutral" },
  { rank: 5, userId: "2024000005", username: "HostelHazard", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=HostelHazard", aura: 9120, wins: 330, winRate: 70, trend: "up" },
  { rank: 6, userId: "2024000008", username: "BoundaryBully", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=BoundaryBully", aura: 8430, wins: 300, winRate: 68, trend: "down" },
  { rank: 7, userId: "2024000004", username: "IsekaiInsulter", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=IsekaiInsulter", aura: 7910, wins: 285, winRate: 65, trend: "neutral" },
  { rank: 8, userId: "2024000006", username: "DayScholarDrip", avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=DayScholarDrip", aura: 7300, wins: 260, winRate: 63, trend: "up" },
];

export const mockAuraHistory: AuraTransaction[] = [
  { id: "t_001", reason: "Battle Win vs AppleAuraFarm", amount: 25, timestamp: "2026-06-14T10:45:00Z" },
  { id: "t_002", reason: "Daily Challenge Completed", amount: 10, timestamp: "2026-06-14T08:10:00Z" },
  { id: "t_003", reason: "Dominant Win vs ShonenSlander", amount: 50, timestamp: "2026-06-13T21:30:00Z" },
  { id: "t_004", reason: "Battle Loss vs PitchProphet", amount: -15, timestamp: "2026-06-13T19:00:00Z" },
  { id: "t_005", reason: "Tournament Win — College Clash", amount: 100, timestamp: "2026-06-12T17:00:00Z" },
];

export const mockGroups: RageGroup[] = [
  {
    id: "g_001",
    name: "Android vs iPhone HQ",
    description: "The eternal war. Bring your best comebacks.",
    bannerUrl: "",
    memberCount: 48210,
    topics: ["Android vs iPhone", "Technology"],
  },
  {
    id: "g_002",
    name: "Anime Debate Arena",
    description: "Power scaling, ship wars, and filler arc slander.",
    bannerUrl: "",
    memberCount: 39250,
    topics: ["Anime", "Internet Culture"],
  },
  {
    id: "g_003",
    name: "Desi College Chaos",
    description: "Hostel vs Day Scholar, Engineering vs Everyone.",
    bannerUrl: "",
    memberCount: 21010,
    topics: ["College Life", "Internet Culture"],
  },
];
