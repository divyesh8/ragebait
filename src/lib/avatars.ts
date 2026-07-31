export type AvatarCategoryId =
  | "cyberpunk"
  | "sigma-dark"
  | "anime-male"
  | "anime-female"
  | "gaming"
  | "fantasy"
  | "animals"
  | "cute"
  | "meme-style"
  | "robots-ai"
  | "space"
  | "heroes"
  | "villains"
  | "professional"
  | "sports"
  | "mythology"
  | "seasonal"
  | "street-fashion";

export type AvatarRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic"
  | "animated"
  | "exclusive";

export type AvatarFrameId = "none" | "fire" | "lightning" | "neon" | "glitch" | "ice" | "galaxy";

export type AvatarMotion = "none" | "glowing-eyes" | "holographic-shimmer" | "subtle-blink";

export interface AvatarCategory {
  id: AvatarCategoryId;
  label: string;
  count: number;
  accentColor: string;
  tags: string[];
}

export interface AvatarOption {
  id: string;
  name: string;
  url: string;
  categoryId: AvatarCategoryId;
  categoryLabel: string;
  rarity: AvatarRarity;
  tags: string[];
  accentColor: string;
  frameId: AvatarFrameId;
  motion: AvatarMotion;
  isNew: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  theme: {
    primary: string;
    secondary: string;
    background: string;
  };
  searchText: string;
}

export interface AvatarRarityInfo {
  id: AvatarRarity;
  label: string;
  rank: number;
  color: string;
  freeNow: boolean;
}

export interface AvatarFrame {
  id: AvatarFrameId;
  label: string;
  rarity: AvatarRarity;
  className: string;
}

export interface StatusBadge {
  id: string;
  label: string;
  rarity: AvatarRarity;
  accentColor: string;
}

interface AvatarCategoryConfig {
  id: AvatarCategoryId;
  label: string;
  count: number;
  accentColor: string;
  accents: string[];
  bg: [string, string];
  archetypes: string[];
  tags: string[];
}

export const AVATAR_RARITIES: AvatarRarityInfo[] = [
  { id: "common", label: "Common", rank: 1, color: "#B7BDC8", freeNow: true },
  { id: "rare", label: "Rare", rank: 2, color: "#00E5FF", freeNow: true },
  { id: "epic", label: "Epic", rank: 3, color: "#A78BFA", freeNow: true },
  { id: "legendary", label: "Legendary", rank: 4, color: "#FFB020", freeNow: true },
  { id: "mythic", label: "Mythic", rank: 5, color: "#FF1E1E", freeNow: true },
  { id: "animated", label: "Animated", rank: 6, color: "#20E3B2", freeNow: true },
  { id: "exclusive", label: "Exclusive", rank: 7, color: "#FFFFFF", freeNow: true },
];

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: "none", label: "Clean", rarity: "common", className: "" },
  { id: "fire", label: "Fire", rarity: "epic", className: "avatar-frame-fire" },
  { id: "lightning", label: "Lightning", rarity: "legendary", className: "avatar-frame-lightning" },
  { id: "neon", label: "Neon", rarity: "rare", className: "avatar-frame-neon" },
  { id: "glitch", label: "Glitch", rarity: "animated", className: "avatar-frame-glitch" },
  { id: "ice", label: "Ice", rarity: "rare", className: "avatar-frame-ice" },
  { id: "galaxy", label: "Galaxy", rarity: "mythic", className: "avatar-frame-galaxy" },
];

export const STATUS_BADGES: StatusBadge[] = [
  { id: "verified", label: "Verified", rarity: "rare", accentColor: "#00E5FF" },
  { id: "champion", label: "Champion", rarity: "legendary", accentColor: "#FFB020" },
  { id: "top-roaster", label: "Top Roaster", rarity: "epic", accentColor: "#FF1E1E" },
  { id: "ai-slayer", label: "AI Slayer", rarity: "mythic", accentColor: "#20E3B2" },
  { id: "og-user", label: "OG User", rarity: "exclusive", accentColor: "#FFFFFF" },
  { id: "beta-tester", label: "Beta Tester", rarity: "rare", accentColor: "#A78BFA" },
  { id: "creator-pick", label: "Creator Pick", rarity: "exclusive", accentColor: "#FF7A18" },
];

const CATEGORY_CONFIG: AvatarCategoryConfig[] = [
  {
    id: "cyberpunk",
    label: "Cyber Humans",
    count: 36,
    accentColor: "#00E5FF",
    accents: ["#00E5FF", "#FF1E1E", "#FF7A18", "#9D4DFF", "#20E3B2", "#FFFFFF"],
    bg: ["#02040A", "#07182A"],
    archetypes: [
      "neon hacker",
      "chrome rebel",
      "holo streamer",
      "cyber detective",
      "night driver",
      "glitch artist",
      "drone pilot",
      "street samurai",
      "tech broker",
      "signal runner",
      "neon medic",
      "augmented DJ",
    ],
    tags: ["human", "animated", "portrait", "neon", "cyber", "hacker", "chrome", "blue", "red", "samurai", "detective", "streamer"],
  },
  {
    id: "sigma-dark",
    label: "Noir Humans",
    count: 30,
    accentColor: "#FF1E1E",
    accents: ["#FF1E1E", "#FFFFFF", "#FF7A18", "#5B6472", "#A78BFA"],
    bg: ["#030303", "#111111"],
    archetypes: [
      "hooded thinker",
      "noir boss",
      "shadow poet",
      "midnight rebel",
      "goth monarch",
      "quiet strategist",
      "velvet villain",
      "black coat icon",
      "red eye roaster",
      "storm loner",
    ],
    tags: ["human", "animated", "portrait", "dark", "noir", "hoodie", "black", "red", "shadow", "goth", "rebel"],
  },
  {
    id: "anime-male",
    label: "Animated Men",
    count: 34,
    accentColor: "#5EE7FF",
    accents: ["#5EE7FF", "#FFFFFF", "#2F6CFF", "#FF1E1E", "#C084FC"],
    bg: ["#07101B", "#101827"],
    archetypes: [
      "white hair duelist",
      "black hair rival",
      "blue aura striker",
      "school prodigy",
      "swordsman",
      "demon hunter",
      "storm mage",
      "martial artist",
      "ice captain",
      "fire rookie",
      "sharp-eyed ace",
    ],
    tags: ["human", "animated", "portrait", "anime", "male", "men", "white hair", "black hair", "blue", "aura", "sword", "mage", "martial", "fire", "ice"],
  },
  {
    id: "anime-female",
    label: "Animated Women",
    count: 34,
    accentColor: "#FF4FD8",
    accents: ["#FF4FD8", "#5EE7FF", "#FFFFFF", "#FF7A18", "#A78BFA"],
    bg: ["#090712", "#1A1024"],
    archetypes: [
      "cyber heroine",
      "samurai queen",
      "moon mage",
      "neon idol",
      "rose assassin",
      "lightning archer",
      "witch prodigy",
      "kawaii tactician",
      "star captain",
      "battle artist",
      "velvet rogue",
    ],
    tags: ["human", "animated", "portrait", "anime", "female", "women", "cyber", "samurai", "mage", "queen", "neon", "kawaii", "witch", "lightning"],
  },
  {
    id: "gaming",
    label: "Gaming Humans",
    count: 32,
    accentColor: "#FF7A18",
    accents: ["#FF1E1E", "#00E5FF", "#FFFFFF", "#FF7A18", "#33D17A"],
    bg: ["#05080C", "#101418"],
    archetypes: [
      "FPS captain",
      "battle royale pro",
      "esports caller",
      "VR tactician",
      "arcade boss",
      "retro gamer",
      "stream squad lead",
      "speedrunner",
      "console champion",
      "LAN legend",
      "ranked grinder",
    ],
    tags: ["human", "animated", "portrait", "gaming", "fps", "battle", "esports", "streamer", "retro", "vr", "console", "ranked"],
  },
  {
    id: "fantasy",
    label: "Fantasy Humans",
    count: 36,
    accentColor: "#FFB020",
    accents: ["#FFB020", "#A78BFA", "#20E3B2", "#FF1E1E", "#FFFFFF"],
    bg: ["#07070A", "#18131F"],
    archetypes: [
      "elf noble",
      "dragon knight",
      "necromancer",
      "wizard scholar",
      "paladin",
      "shadow assassin",
      "sun priest",
      "desert nomad",
      "rune keeper",
      "witch queen",
      "royal guard",
      "gladiator",
    ],
    tags: ["human", "animated", "portrait", "fantasy", "elf", "dragon", "knight", "necromancer", "wizard", "paladin", "shadow", "witch", "royal", "gladiator"],
  },
  {
    id: "animals",
    label: "Wild Style Humans",
    count: 24,
    accentColor: "#FFB020",
    accents: ["#FFB020", "#FF1E1E", "#FFFFFF", "#00E5FF", "#8A5A44"],
    bg: ["#050505", "#16120F"],
    archetypes: ["wolf cut rebel", "tiger stripe roaster", "fox spirit stylist", "panther noir", "eagle-eyed captain", "owl scholar", "bear jacket brawler", "raven mage", "dragon-jacket rider", "arctic wanderer", "lion mane leader", "serpent stare"],
    tags: ["human", "animated", "portrait", "wild", "street", "rebel", "stylist", "captain", "scholar", "leader", "wanderer"],
  },
  {
    id: "cute",
    label: "Soft Animated",
    count: 28,
    accentColor: "#FF4FD8",
    accents: ["#FF7A18", "#FF4FD8", "#FFFFFF", "#00E5FF", "#B7F7D4"],
    bg: ["#07100E", "#161A1C"],
    archetypes: ["soft smile", "round glasses", "pastel gamer", "chibi hero", "sunny creator", "gentle rebel", "tiny astronaut", "cozy hoodie", "sparkle artist", "bubblegum DJ", "warm strategist", "daydream ace"],
    tags: ["human", "animated", "portrait", "soft", "cute", "glasses", "pastel", "chibi", "kawaii", "cozy", "hoodie", "creator"],
  },
  {
    id: "meme-style",
    label: "Expressive Humans",
    count: 22,
    accentColor: "#7DFF6A",
    accents: ["#7DFF6A", "#FF1E1E", "#FFFFFF", "#00E5FF", "#FFB020"],
    bg: ["#050505", "#111827"],
    archetypes: ["side-eye expert", "smirk merchant", "reaction face", "deadpan genius", "chaos streamer", "pixel hoodie", "retro mascot fan", "laughing roaster", "confident caller", "internet legend", "comic relief"],
    tags: ["human", "animated", "portrait", "meme", "funny", "reaction", "side-eye", "smirk", "streamer", "retro", "comic"],
  },
  {
    id: "robots-ai",
    label: "AI Humans",
    count: 32,
    accentColor: "#00E5FF",
    accents: ["#00E5FF", "#FFFFFF", "#FF1E1E", "#8B5CF6", "#20E3B2"],
    bg: ["#030914", "#0D1724"],
    archetypes: ["AI researcher", "synthetic stylist", "hologram host", "quantum assistant", "neural DJ", "future analyst", "machine poet", "circuit artist", "data monk", "synthetic fashion lead", "prompt engineer"],
    tags: ["human", "animated", "portrait", "ai", "hologram", "blue", "synthetic", "quantum", "data", "prompt", "researcher"],
  },
  {
    id: "space",
    label: "Sci-Fi Humans",
    count: 28,
    accentColor: "#A78BFA",
    accents: ["#FFFFFF", "#00E5FF", "#FF1E1E", "#A78BFA", "#FFB020"],
    bg: ["#02030A", "#101637"],
    archetypes: ["astronaut captain", "nebula scout", "starship pilot", "planet explorer", "cosmic knight", "orbital racer", "void cartographer", "interstellar diplomat", "moon engineer"],
    tags: ["human", "animated", "portrait", "space", "sci-fi", "astronaut", "galaxy", "planet", "cosmic", "captain", "racer", "nebula"],
  },
  {
    id: "heroes",
    label: "Hero Humans",
    count: 28,
    accentColor: "#F9C74F",
    accents: ["#F9C74F", "#00E5FF", "#FF1E1E", "#FFFFFF", "#33D17A"],
    bg: ["#05070B", "#132033"],
    archetypes: ["solar champion", "masked defender", "storm guardian", "street savior", "cosmic protector", "fire sentinel", "ice ranger", "wind runner", "earth titan", "light paladin"],
    tags: ["human", "animated", "portrait", "hero", "superhero", "original", "champion", "masked", "guardian", "fire", "ice", "wind", "earth", "light"],
  },
  {
    id: "villains",
    label: "Villain Humans",
    count: 28,
    accentColor: "#B91C1C",
    accents: ["#B91C1C", "#A78BFA", "#FFFFFF", "#FF7A18", "#5B6472"],
    bg: ["#050304", "#1B0B12"],
    archetypes: ["mastermind", "velvet tyrant", "shadow queen", "cyber warlord", "void aristocrat", "poison tactician", "mirror villain", "lava baron", "ice empress", "storm raider"],
    tags: ["human", "animated", "portrait", "villain", "antihero", "masked", "dark", "mastermind", "warlord", "queen", "poison", "lava", "storm"],
  },
  {
    id: "professional",
    label: "Professional Humans",
    count: 24,
    accentColor: "#FFFFFF",
    accents: ["#FFFFFF", "#00E5FF", "#FFB020", "#33D17A", "#A78BFA"],
    bg: ["#060606", "#141820"],
    archetypes: ["CEO", "scientist", "professor", "detective", "hacker", "lawyer", "architect", "doctor", "founder", "journalist", "analyst", "operator"],
    tags: ["human", "animated", "portrait", "professional", "ceo", "scientist", "professor", "detective", "hacker", "lawyer", "architect", "doctor", "founder", "analyst"],
  },
  {
    id: "sports",
    label: "Sports Humans",
    count: 24,
    accentColor: "#20E3B2",
    accents: ["#20E3B2", "#FFB020", "#FF1E1E", "#FFFFFF", "#00E5FF"],
    bg: ["#04100D", "#12201D"],
    archetypes: ["boxer", "martial artist", "gym captain", "racing driver", "football striker", "basketball guard", "cricket batter", "skater", "sprinter", "goalkeeper", "coach", "powerlifter"],
    tags: ["human", "animated", "portrait", "sports", "boxer", "martial", "gym", "racing", "football", "basketball", "cricket", "skater", "sprinter", "coach"],
  },
  {
    id: "mythology",
    label: "Mythic Humans",
    count: 24,
    accentColor: "#A78BFA",
    accents: ["#A78BFA", "#FFB020", "#FFFFFF", "#FF1E1E", "#20E3B2"],
    bg: ["#08060F", "#1A1430"],
    archetypes: ["thunder oracle", "sun priest", "moon warrior", "serpent sage", "phoenix knight", "underworld guard", "ocean mystic", "forest spirit", "rune keeper", "sky herald"],
    tags: ["human", "animated", "portrait", "mythology", "thunder", "sun", "moon", "serpent", "phoenix", "underworld", "ocean", "forest", "rune"],
  },
  {
    id: "seasonal",
    label: "Seasonal Humans",
    count: 18,
    accentColor: "#FF7A18",
    accents: ["#FF7A18", "#00E5FF", "#FFFFFF", "#33D17A", "#FF4FD8"],
    bg: ["#07100E", "#1B1B12"],
    archetypes: ["fire festival", "ice festival", "monsoon wanderer", "spring mage", "autumn rogue", "winter explorer", "summer racer", "night market hero", "holiday hacker"],
    tags: ["human", "animated", "portrait", "seasonal", "fire", "ice", "spring", "autumn", "winter", "summer", "festival", "holiday", "market"],
  },
  {
    id: "street-fashion",
    label: "Street Humans",
    count: 18,
    accentColor: "#FF4FD8",
    accents: ["#FF4FD8", "#FF7A18", "#FFFFFF", "#00E5FF", "#7DFF6A"],
    bg: ["#07070A", "#151019"],
    archetypes: ["luxury hacker", "punk vocalist", "emo guitarist", "goth stylist", "vaporwave DJ", "retro dancer", "neon sneakerhead", "minimalist model", "street photographer"],
    tags: ["human", "animated", "portrait", "street", "fashion", "luxury", "punk", "emo", "goth", "vaporwave", "dj", "retro", "minimal", "sneaker"],
  },
];

const NAME_PREFIXES = [
  "Neon",
  "Void",
  "Rage",
  "Prime",
  "Chrome",
  "Night",
  "Omega",
  "Vanta",
  "Blitz",
  "Nova",
  "Ghost",
  "Apex",
  "Solar",
  "Frost",
  "Inferno",
  "Cipher",
];

const USERNAME_PREFIXES = ["Void", "Neon", "Rage", "Apex", "Ghost", "Chrome", "Nitro", "Vanta", "Blitz", "Nova"];
const USERNAME_SUFFIXES = ["Roaster", "Cipher", "Striker", "Savant", "Phantom", "Runner", "Blade", "Oracle", "Boss", "Core"];

export const AVATAR_CATEGORIES: AvatarCategory[] = CATEGORY_CONFIG.map((category) => ({
  id: category.id,
  label: category.label,
  count: category.count,
  accentColor: category.accentColor,
  tags: category.tags,
}));

export const AVATAR_TOTAL = CATEGORY_CONFIG.reduce((sum, category) => sum + category.count, 0);

export const AVATAR_OPTIONS: AvatarOption[] = CATEGORY_CONFIG.flatMap((category, categoryIndex) =>
  Array.from({ length: category.count }, (_, index) => {
    const globalIndex = CATEGORY_CONFIG.slice(0, categoryIndex).reduce((sum, item) => sum + item.count, 0) + index;
    const id = `${category.id}-${String(index + 1).padStart(3, "0")}`;
    const archetype = category.archetypes[index % category.archetypes.length];
    const accentColor = category.accents[(index + categoryIndex) % category.accents.length];
    const secondary = category.accents[(index + categoryIndex + 1) % category.accents.length];
    const rarity = getRarity(globalIndex, index);
    const motion = getMotion(globalIndex, rarity);
    const frameId = getFrameId(globalIndex, rarity);
    const name = `${NAME_PREFIXES[(globalIndex + categoryIndex) % NAME_PREFIXES.length]} ${toTitleCase(archetype)}`;
    const tags = normalizeTags([
      category.id,
      category.label,
      archetype,
      rarity,
      getColorTag(accentColor),
      ...category.tags,
    ]);

    return {
      id,
      name,
      url: `/avatars/ragebait/${id}.webp`,
      categoryId: category.id,
      categoryLabel: category.label,
      rarity,
      tags,
      accentColor,
      frameId,
      motion,
      isNew: globalIndex % 5 === 0 || index >= category.count - 2,
      isTrending: globalIndex % 7 === 0 || rarity === "legendary" || rarity === "mythic" || rarity === "exclusive",
      isFeatured: globalIndex % 11 === 0 || rarity === "exclusive",
      isHidden: false,
      theme: {
        primary: accentColor,
        secondary,
        background: category.bg[0],
      },
      searchText: "",
    };
  })
).map((avatar) => ({
  ...avatar,
  searchText: normalizeTags([avatar.name, avatar.categoryLabel, avatar.rarity, ...avatar.tags]).join(" "),
}));

const byId = new Map(AVATAR_OPTIONS.map((avatar) => [avatar.id, avatar]));
const byUrl = new Map(AVATAR_OPTIONS.map((avatar) => [avatar.url, avatar]));
const rarityById = new Map(AVATAR_RARITIES.map((rarity) => [rarity.id, rarity]));
const frameById = new Map(AVATAR_FRAMES.map((frame) => [frame.id, frame]));

/** Returns the avatar URL for a curated option id, or null if it is not whitelisted. */
export function resolveAvatarId(id: string): string | null {
  return byId.get(id)?.url ?? null;
}

export function resolveAvatarMeta(id: string): AvatarOption | null {
  return byId.get(id) ?? null;
}

export function resolveAvatarFromUrl(url: string | null | undefined): AvatarOption | null {
  if (!url) return null;
  return byUrl.get(url) ?? null;
}

export function getAvatarRarityInfo(rarity: AvatarRarity): AvatarRarityInfo {
  return rarityById.get(rarity) ?? AVATAR_RARITIES[0];
}

export function getAvatarFrame(frameId: AvatarFrameId): AvatarFrame {
  return frameById.get(frameId) ?? AVATAR_FRAMES[0];
}

export function getFallbackAvatar(username: string): AvatarOption {
  const index = hashString(username.toLowerCase()) % AVATAR_OPTIONS.length;
  return AVATAR_OPTIONS[index];
}

export function getFallbackAvatarUrl(username: string): string {
  return getFallbackAvatar(username).url;
}

export function createRandomIdentity(seed = Date.now()) {
  const prefix = USERNAME_PREFIXES[seed % USERNAME_PREFIXES.length];
  const suffix = USERNAME_SUFFIXES[Math.floor(seed / USERNAME_PREFIXES.length) % USERNAME_SUFFIXES.length];
  const number = 100 + (seed % 900);
  const avatar = AVATAR_OPTIONS[seed % AVATAR_OPTIONS.length];

  return {
    username: `${prefix}${suffix}${number}`,
    accentColor: avatar.accentColor,
    avatar,
  };
}

function getRarity(globalIndex: number, categoryIndex: number): AvatarRarity {
  if ((globalIndex + 1) % 97 === 0) return "exclusive";
  if ((globalIndex + 1) % 53 === 0) return "animated";
  if ((globalIndex + categoryIndex) % 31 === 0) return "mythic";
  if ((globalIndex + 3) % 17 === 0) return "legendary";
  if ((globalIndex + 5) % 9 === 0) return "epic";
  if ((globalIndex + categoryIndex) % 4 === 0) return "rare";
  return "common";
}

function getFrameId(globalIndex: number, rarity: AvatarRarity): AvatarFrameId {
  if (rarity === "common") return "none";
  if (rarity === "exclusive") return "galaxy";
  if (rarity === "animated") return "glitch";
  const frames: AvatarFrameId[] = ["neon", "fire", "ice", "lightning", "galaxy"];
  return frames[globalIndex % frames.length];
}

function getMotion(globalIndex: number, rarity: AvatarRarity): AvatarMotion {
  if (rarity === "animated") return "holographic-shimmer";
  if (rarity === "mythic" || rarity === "exclusive") return "glowing-eyes";
  if (globalIndex % 13 === 0) return "subtle-blink";
  return "none";
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeTags(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(/[\s/:-]+/))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function getColorTag(hex: string): string {
  const tags: Record<string, string> = {
    "#00E5FF": "blue",
    "#5EE7FF": "blue",
    "#2F6CFF": "blue",
    "#FF1E1E": "red",
    "#E50914": "red",
    "#FF7A18": "orange",
    "#FFB020": "gold",
    "#FFFFFF": "white",
    "#FF4FD8": "pink",
    "#9D4DFF": "purple",
    "#A78BFA": "purple",
    "#8B5CF6": "purple",
    "#20E3B2": "green",
    "#33D17A": "green",
    "#7DFF6A": "green",
  };
  return tags[hex.toUpperCase()] ?? "dark";
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
