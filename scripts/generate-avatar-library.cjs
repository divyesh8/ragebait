const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SIZE = 512;
const OUTPUT_SIZE = 512;
const OUT_DIR = path.join(process.cwd(), "public", "avatars", "ragebait");
const HASH_SIZE = 16;
const MAX_PERCEPTUAL_SIMILARITY = 0.88;
const MAX_RENDER_ATTEMPTS = 4;
const MAX_HASH_COMPARISONS = 120;

const categories = [
  {
    id: "cyberpunk",
    count: 36,
    label: "Cyber Humans",
    vibe: "cyberpunk",
    accents: ["#00E5FF", "#FF1E1E", "#FF7A18", "#9D4DFF", "#20E3B2", "#FFFFFF"],
    bg: ["#02040A", "#07182A"],
    archetypes: ["neon hacker", "chrome rebel", "holo streamer", "cyber detective", "night driver", "glitch artist", "drone pilot", "street samurai", "tech broker", "signal runner", "neon medic", "augmented DJ"],
  },
  {
    id: "sigma-dark",
    count: 30,
    label: "Noir Humans",
    vibe: "dark",
    accents: ["#FF1E1E", "#FFFFFF", "#FF7A18", "#5B6472", "#A78BFA"],
    bg: ["#030303", "#111111"],
    archetypes: ["hooded thinker", "noir boss", "shadow poet", "midnight rebel", "goth monarch", "quiet strategist", "velvet villain", "black coat icon", "red eye roaster", "storm loner"],
  },
  {
    id: "anime-male",
    count: 34,
    label: "Animated Men",
    vibe: "anime",
    genderMode: "masculine",
    accents: ["#5EE7FF", "#FFFFFF", "#2F6CFF", "#FF1E1E", "#C084FC"],
    bg: ["#07101B", "#101827"],
    archetypes: ["white hair duelist", "black hair rival", "blue aura striker", "school prodigy", "swordsman", "demon hunter", "storm mage", "martial artist", "ice captain", "fire rookie", "sharp-eyed ace"],
  },
  {
    id: "anime-female",
    count: 34,
    label: "Animated Women",
    vibe: "anime",
    genderMode: "feminine",
    accents: ["#FF4FD8", "#5EE7FF", "#FFFFFF", "#FF7A18", "#A78BFA"],
    bg: ["#090712", "#1A1024"],
    archetypes: ["cyber heroine", "samurai queen", "moon mage", "neon idol", "rose assassin", "lightning archer", "witch prodigy", "kawaii tactician", "star captain", "battle artist", "velvet rogue"],
  },
  {
    id: "gaming",
    count: 32,
    label: "Gaming Humans",
    vibe: "gaming",
    accents: ["#FF1E1E", "#00E5FF", "#FFFFFF", "#FF7A18", "#33D17A"],
    bg: ["#05080C", "#101418"],
    archetypes: ["FPS captain", "battle royale pro", "esports caller", "VR tactician", "arcade boss", "retro gamer", "stream squad lead", "speedrunner", "console champion", "LAN legend", "ranked grinder"],
  },
  {
    id: "fantasy",
    count: 36,
    label: "Fantasy Humans",
    vibe: "fantasy",
    accents: ["#FFB020", "#A78BFA", "#20E3B2", "#FF1E1E", "#FFFFFF"],
    bg: ["#07070A", "#18131F"],
    archetypes: ["elf noble", "dragon knight", "necromancer", "wizard scholar", "paladin", "shadow assassin", "sun priest", "desert nomad", "rune keeper", "witch queen", "royal guard", "gladiator"],
  },
  {
    id: "animals",
    count: 24,
    label: "Wild Style Humans",
    vibe: "street",
    accents: ["#FFB020", "#FF1E1E", "#FFFFFF", "#00E5FF", "#8A5A44"],
    bg: ["#050505", "#16120F"],
    archetypes: ["wolf cut rebel", "tiger stripe roaster", "fox spirit stylist", "panther noir", "eagle-eyed captain", "owl scholar", "bear jacket brawler", "raven mage", "dragon-jacket rider", "arctic wanderer", "lion mane leader", "serpent stare"],
  },
  {
    id: "cute",
    count: 28,
    label: "Soft Animated",
    vibe: "cute",
    accents: ["#FF7A18", "#FF4FD8", "#FFFFFF", "#00E5FF", "#B7F7D4"],
    bg: ["#07100E", "#161A1C"],
    archetypes: ["soft smile", "round glasses", "pastel gamer", "chibi hero", "sunny creator", "gentle rebel", "tiny astronaut", "cozy hoodie", "sparkle artist", "bubblegum DJ", "warm strategist", "daydream ace"],
  },
  {
    id: "meme-style",
    count: 22,
    label: "Expressive Humans",
    vibe: "meme",
    accents: ["#7DFF6A", "#FF1E1E", "#FFFFFF", "#00E5FF", "#FFB020"],
    bg: ["#050505", "#111827"],
    archetypes: ["side-eye expert", "smirk merchant", "reaction face", "deadpan genius", "chaos streamer", "pixel hoodie", "retro mascot fan", "laughing roaster", "confident caller", "internet legend", "comic relief"],
  },
  {
    id: "robots-ai",
    count: 32,
    label: "AI Humans",
    vibe: "ai",
    accents: ["#00E5FF", "#FFFFFF", "#FF1E1E", "#8B5CF6", "#20E3B2"],
    bg: ["#030914", "#0D1724"],
    archetypes: ["AI researcher", "synthetic stylist", "hologram host", "quantum assistant", "neural DJ", "future analyst", "machine poet", "circuit artist", "data monk", "synthetic fashion lead", "prompt engineer"],
  },
  {
    id: "space",
    count: 28,
    label: "Sci-Fi Humans",
    vibe: "space",
    accents: ["#FFFFFF", "#00E5FF", "#FF1E1E", "#A78BFA", "#FFB020"],
    bg: ["#02030A", "#101637"],
    archetypes: ["astronaut captain", "nebula scout", "starship pilot", "planet explorer", "cosmic knight", "orbital racer", "void cartographer", "interstellar diplomat", "moon engineer"],
  },
  {
    id: "heroes",
    count: 28,
    label: "Hero Humans",
    vibe: "hero",
    accents: ["#F9C74F", "#00E5FF", "#FF1E1E", "#FFFFFF", "#33D17A"],
    bg: ["#05070B", "#132033"],
    archetypes: ["solar champion", "masked defender", "storm guardian", "street savior", "cosmic protector", "fire sentinel", "ice ranger", "wind runner", "earth titan", "light paladin"],
  },
  {
    id: "villains",
    count: 28,
    label: "Villain Humans",
    vibe: "villain",
    accents: ["#B91C1C", "#A78BFA", "#FFFFFF", "#FF7A18", "#5B6472"],
    bg: ["#050304", "#1B0B12"],
    archetypes: ["mastermind", "velvet tyrant", "shadow queen", "cyber warlord", "void aristocrat", "poison tactician", "mirror villain", "lava baron", "ice empress", "storm raider"],
  },
  {
    id: "professional",
    count: 24,
    label: "Professional Humans",
    vibe: "professional",
    accents: ["#FFFFFF", "#00E5FF", "#FFB020", "#33D17A", "#A78BFA"],
    bg: ["#060606", "#141820"],
    archetypes: ["CEO", "scientist", "professor", "detective", "hacker", "lawyer", "architect", "doctor", "founder", "journalist", "analyst", "operator"],
  },
  {
    id: "sports",
    count: 24,
    label: "Sports Humans",
    vibe: "sports",
    accents: ["#20E3B2", "#FFB020", "#FF1E1E", "#FFFFFF", "#00E5FF"],
    bg: ["#04100D", "#12201D"],
    archetypes: ["boxer", "martial artist", "gym captain", "racing driver", "football striker", "basketball guard", "cricket batter", "skater", "sprinter", "goalkeeper", "coach", "powerlifter"],
  },
  {
    id: "mythology",
    count: 24,
    label: "Mythic Humans",
    vibe: "mythology",
    accents: ["#A78BFA", "#FFB020", "#FFFFFF", "#FF1E1E", "#20E3B2"],
    bg: ["#08060F", "#1A1430"],
    archetypes: ["thunder oracle", "sun priest", "moon warrior", "serpent sage", "phoenix knight", "underworld guard", "ocean mystic", "forest spirit", "rune keeper", "sky herald"],
  },
  {
    id: "seasonal",
    count: 18,
    label: "Seasonal Humans",
    vibe: "seasonal",
    accents: ["#FF7A18", "#00E5FF", "#FFFFFF", "#33D17A", "#FF4FD8"],
    bg: ["#07100E", "#1B1B12"],
    archetypes: ["fire festival", "ice festival", "monsoon wanderer", "spring mage", "autumn rogue", "winter explorer", "summer racer", "night market hero", "holiday hacker"],
  },
  {
    id: "street-fashion",
    count: 18,
    label: "Street Humans",
    vibe: "street",
    accents: ["#FF4FD8", "#FF7A18", "#FFFFFF", "#00E5FF", "#7DFF6A"],
    bg: ["#07070A", "#151019"],
    archetypes: ["luxury hacker", "punk vocalist", "emo guitarist", "goth stylist", "vaporwave DJ", "retro dancer", "neon sneakerhead", "minimalist model", "street photographer"],
  },
];

const SKIN_TONES = ["#F2C7A5", "#D9A071", "#A86C4A", "#704434", "#C58B6B", "#F0D0B8", "#8D5A42", "#E6B98E", "#B57955", "#5E382F"];
const HAIR_COLORS = ["#101114", "#2F1E16", "#EFE9DA", "#7C2D12", "#1F3A5F", "#6D28D9", "#C084FC", "#D7A24A", "#D946EF", "#0F766E", "#F8FAFC"];
const EYE_COLORS = ["#2DD4BF", "#38BDF8", "#FBBF24", "#A78BFA", "#34D399", "#F87171", "#E5E7EB", "#111827"];

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function shade(colorValue, amount) {
  const base = Array.isArray(colorValue) ? colorValue : hexToRgb(colorValue);
  const target = amount > 0 ? [255, 255, 255] : [0, 0, 0];
  return mix(base, target, Math.abs(amount));
}

function color(hex, alpha = 255) {
  return [...hexToRgb(hex), alpha];
}

function rgba(rgb, alpha = 255) {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

function pick(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

class Canvas {
  constructor(size) {
    this.size = size;
    this.scale = size / 512;
    this.data = new Uint8ClampedArray(size * size * 4);
  }

  d(value) {
    return value * this.scale;
  }

  designX(pixel) {
    return (pixel + 0.5) / this.scale;
  }

  blendPixel(x, y, colorValue, alpha = 1) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size || alpha <= 0) return;
    const circleDx = ((x + 0.5) / this.size - 0.5) / 0.5;
    const circleDy = ((y + 0.5) / this.size - 0.5) / 0.5;
    const circleDistance = Math.sqrt(circleDx * circleDx + circleDy * circleDy);
    if (circleDistance > 1.035) return;
    const circleClip = clamp((1.035 - circleDistance) / 0.055);
    const idx = (y * this.size + x) * 4;
    const srcA = clamp(alpha * circleClip * ((colorValue[3] ?? 255) / 255));
    if (srcA <= 0) return;
    const dstA = this.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    const keep = dstA * (1 - srcA);
    this.data[idx] = Math.round((colorValue[0] * srcA + this.data[idx] * keep) / outA);
    this.data[idx + 1] = Math.round((colorValue[1] * srcA + this.data[idx + 1] * keep) / outA);
    this.data[idx + 2] = Math.round((colorValue[2] * srcA + this.data[idx + 2] * keep) / outA);
    this.data[idx + 3] = Math.round(outA * 255);
  }

  fillCircleBackground(theme, rng) {
    const bgA = hexToRgb(theme.bg[0]);
    const bgB = hexToRgb(theme.bg[1]);
    const primary = hexToRgb(theme.accents[0]);
    const secondary = hexToRgb(theme.accents[1] ?? theme.accents[0]);
    const glowX = 0.18 + rng() * 0.64;
    const glowY = 0.12 + rng() * 0.52;
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        const nx = (x + 0.5) / this.size;
        const ny = (y + 0.5) / this.size;
        const dx = (nx - 0.5) / 0.5;
        const dy = (ny - 0.5) / 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.035) continue;
        const edge = clamp((1.035 - dist) / 0.055);
        let pixel = mix(bgA, bgB, clamp(nx * 0.45 + ny * 0.55));
        const glow = clamp(1 - Math.hypot(nx - glowX, ny - glowY) / 0.5);
        const counter = clamp(1 - Math.hypot(nx - 0.75, ny - 0.78) / 0.55);
        pixel = mix(pixel, primary, glow * 0.38);
        pixel = mix(pixel, secondary, counter * 0.24);
        pixel = pixel.map((v) => Math.round(v * clamp(1 - dist * 0.3)));
        const idx = (y * this.size + x) * 4;
        this.data[idx] = pixel[0];
        this.data[idx + 1] = pixel[1];
        this.data[idx + 2] = pixel[2];
        this.data[idx + 3] = Math.round(edge * 255);
      }
    }
  }

  ellipse(cx, cy, rx, ry, colorValue, alpha = 1) {
    const x0 = Math.floor(this.d(cx - rx - 3));
    const x1 = Math.ceil(this.d(cx + rx + 3));
    const y0 = Math.floor(this.d(cy - ry - 3));
    const y1 = Math.ceil(this.d(cy + ry + 3));
    for (let y = y0; y <= y1; y += 1) {
      const dy = (this.designX(y) - cy) / ry;
      for (let x = x0; x <= x1; x += 1) {
        const dx = (this.designX(x) - cx) / rx;
        const d = Math.sqrt(dx * dx + dy * dy);
        const coverage = clamp((1.025 - d) / 0.055);
        this.blendPixel(x, y, colorValue, alpha * coverage);
      }
    }
  }

  ring(cx, cy, rx, ry, width, colorValue, alpha = 1) {
    const x0 = Math.floor(this.d(cx - rx - width - 3));
    const x1 = Math.ceil(this.d(cx + rx + width + 3));
    const y0 = Math.floor(this.d(cy - ry - width - 3));
    const y1 = Math.ceil(this.d(cy + ry + width + 3));
    const inner = 1 - width / Math.max(rx, ry);
    for (let y = y0; y <= y1; y += 1) {
      const dy = (this.designX(y) - cy) / ry;
      for (let x = x0; x <= x1; x += 1) {
        const dx = (this.designX(x) - cx) / rx;
        const d = Math.sqrt(dx * dx + dy * dy);
        const outerCoverage = clamp((1.02 - d) / 0.045);
        const innerCoverage = clamp((d - inner) / 0.045);
        this.blendPixel(x, y, colorValue, alpha * outerCoverage * innerCoverage);
      }
    }
  }

  rect(x, y, w, h, colorValue, alpha = 1, radius = 0) {
    const x0 = Math.floor(this.d(x));
    const x1 = Math.ceil(this.d(x + w));
    const y0 = Math.floor(this.d(y));
    const y1 = Math.ceil(this.d(y + h));
    for (let py = y0; py <= y1; py += 1) {
      const dy = this.designX(py);
      for (let px = x0; px <= x1; px += 1) {
        const dx = this.designX(px);
        let coverage = 1;
        if (radius > 0) {
          const qx = Math.max(x + radius - dx, 0, dx - (x + w - radius));
          const qy = Math.max(y + radius - dy, 0, dy - (y + h - radius));
          coverage = clamp((radius + 0.75 - Math.hypot(qx, qy)) / 1.5);
        }
        this.blendPixel(px, py, colorValue, alpha * coverage);
      }
    }
  }

  polygon(points, colorValue, alpha = 1) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x0 = Math.floor(this.d(Math.min(...xs) - 2));
    const x1 = Math.ceil(this.d(Math.max(...xs) + 2));
    const y0 = Math.floor(this.d(Math.min(...ys) - 2));
    const y1 = Math.ceil(this.d(Math.max(...ys) + 2));
    for (let y = y0; y <= y1; y += 1) {
      const dy = this.designX(y);
      for (let x = x0; x <= x1; x += 1) {
        const dx = this.designX(x);
        if (pointInPolygon(dx, dy, points)) this.blendPixel(x, y, colorValue, alpha);
      }
    }
  }

  line(x1, y1, x2, y2, width, colorValue, alpha = 1) {
    const pad = width + 3;
    const x0 = Math.floor(this.d(Math.min(x1, x2) - pad));
    const xMax = Math.ceil(this.d(Math.max(x1, x2) + pad));
    const y0 = Math.floor(this.d(Math.min(y1, y2) - pad));
    const yMax = Math.ceil(this.d(Math.max(y1, y2) + pad));
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    for (let y = y0; y <= yMax; y += 1) {
      const py = this.designX(y);
      for (let x = x0; x <= xMax; x += 1) {
        const px = this.designX(x);
        const t = clamp(((px - x1) * vx + (py - y1) * vy) / len2);
        const cx = x1 + vx * t;
        const cy = y1 + vy * t;
        const d = Math.hypot(px - cx, py - cy);
        const coverage = clamp((width * 0.5 + 0.9 - d) / 1.8);
        this.blendPixel(x, y, colorValue, alpha * coverage);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function resolveGender(category, index, attempt) {
  if (category.genderMode) return category.genderMode;
  const seed = hashString(`${category.id}:${index}:${attempt}:gender`);
  return seed % 2 === 0 ? "masculine" : "feminine";
}

function createProfile(category, index, attempt) {
  const seed = hashString(`${category.id}:${index}:${attempt}`);
  const gender = resolveGender(category, index, attempt);
  const feminine = gender === "feminine";
  const archetype = category.archetypes[(index + attempt) % category.archetypes.length];
  const accent = category.accents[(index + attempt * 3) % category.accents.length];
  const accent2 = category.accents[(index * 2 + attempt + 1) % category.accents.length] ?? accent;
  const skin = pick(SKIN_TONES, seed + index + (feminine ? 3 : 0));
  const hair = pick(HAIR_COLORS, Math.floor(seed / 7) + index * 3 + (feminine ? 2 : 0));
  const eye = pick(EYE_COLORS, Math.floor(seed / 17) + attempt);
  const faceShape = (Math.floor(seed / 29) + index + attempt) % 7;
  const hairStyle = (Math.floor(seed / 41) + index * 2 + (feminine ? 5 : 0) + attempt * 3) % 16;
  const expression = (Math.floor(seed / 53) + index + attempt) % 8;
  const accessory = (Math.floor(seed / 67) + index * 5 + attempt) % 13;
  const eyeShape = (Math.floor(seed / 149) + index + attempt) % 6;
  const noseShape = (Math.floor(seed / 163) + index * 2 + attempt) % 5;
  const facialHair = feminine ? 0 : (Math.floor(seed / 179) + index + attempt) % 7;
  const faceMark = (Math.floor(seed / 191) + index * 3 + attempt) % 9;
  const poseX = -16 + ((Math.floor(seed / 79) + index * 11) % 33);
  const poseY = -8 + ((Math.floor(seed / 97) + index * 7) % 17);
  const faceScale = 0.92 + (((Math.floor(seed / 113) + index) % 15) / 100);
  const shoulderTilt = -12 + ((Math.floor(seed / 131) + index * 3) % 25);

  return {
    id: `${category.id}-${String(index + 1).padStart(3, "0")}`,
    archetype,
    gender,
    feminine,
    vibe: category.vibe,
    accent,
    accent2,
    skin,
    hair,
    eye,
    faceShape,
    hairStyle,
    expression,
    accessory,
    eyeShape,
    noseShape,
    facialHair,
    faceMark,
    poseX,
    poseY,
    faceScale,
    shoulderTilt,
    seed,
  };
}

function drawBackdrop(c, category, profile, rng) {
  const theme = {
    bg: category.bg,
    accents: [profile.accent, profile.accent2, ...category.accents],
  };
  c.fillCircleBackground(theme, rng);
  const accent = color(profile.accent);
  const accent2 = color(profile.accent2);
  c.ring(256, 256, 244, 244, 4, accent, 0.28);

  const stripeCount = 5 + (profile.seed % 7);
  for (let i = 0; i < stripeCount; i += 1) {
    const y = 74 + i * 52 + rng() * 20;
    const x = -70 + rng() * 140;
    c.line(x, y, x + 560, y + profile.shoulderTilt * 2, 1.1 + rng() * 1.8, i % 2 ? accent : accent2, 0.08 + rng() * 0.08);
  }

  if (profile.vibe === "ai" || profile.vibe === "cyberpunk" || profile.vibe === "space") {
    for (let i = 0; i < 7; i += 1) {
      const x = 84 + rng() * 344;
      const y = 62 + rng() * 346;
      c.ring(x, y, 10 + rng() * 18, 10 + rng() * 18, 1.6, i % 2 ? accent : accent2, 0.24);
      c.line(x - 16, y, x + 16, y, 1.2, accent, 0.16);
    }
  }

  if (profile.vibe === "fantasy" || profile.vibe === "mythology") {
    for (let i = 0; i < 12; i += 1) {
      const x = 80 + rng() * 352;
      const y = 55 + rng() * 370;
      c.polygon([[x, y - 7], [x + 6, y], [x, y + 7], [x - 6, y]], i % 2 ? accent : accent2, 0.22);
    }
  }
}

function drawShoulders(c, profile) {
  const accent = color(profile.accent);
  const accent2 = color(profile.accent2);
  const dark = color(profile.vibe === "professional" ? "#111827" : "#0A0A0D");
  const cloth = profile.vibe === "sports" ? accent : profile.vibe === "cute" ? color("#F4D1E8") : profile.vibe === "professional" ? color("#F6F8FB") : dark;
  const cx = 256 + profile.poseX * 0.25;
  const y = 388 + profile.poseY * 0.2;

  c.ellipse(cx, 484, 158, 70, color("#000000", 220), 0.26);
  c.polygon([[95, 512], [150, y + 8], [216, y - 32], [256, y + 28], [296, y - 32], [362, y + 8], [417, 512]], cloth, 0.94);
  c.polygon([[108, 512], [158, y + 18], [225, y - 12], [242, 512]], dark, 0.32);
  c.polygon([[404, 512], [354, y + 18], [287, y - 12], [270, 512]], dark, 0.32);

  if (profile.vibe === "professional") {
    c.polygon([[222, y - 18], [256, y + 48], [290, y - 18], [272, 512], [240, 512]], color("#0B1020"), 0.82);
    c.line(256, y + 50, 256, 500, 4, accent, 0.54);
  } else if (profile.vibe === "hero" || profile.vibe === "villain") {
    c.polygon([[122, 512], [170, y + 10], [232, y - 26], [214, 512]], accent, 0.38);
    c.polygon([[390, 512], [342, y + 10], [280, y - 26], [298, 512]], accent2, 0.34);
    c.line(158, y + 54, 354, y + 54, 5, accent, 0.24);
  } else if (profile.vibe === "street" || profile.vibe === "gaming") {
    c.rect(166, y + 32, 180, 24, color("#050505"), 0.58, 9);
    c.line(166, y + 42, 346, y + 42, 4, accent, 0.5);
  } else {
    c.line(150, y + 46, 362, y + 46, 4, accent, 0.28);
  }

  c.rect(cx - 31, y - 72, 62, 74, color(profile.skin), 0.96, 19);
  c.ellipse(cx, y - 3, 42, 16, rgba(shade(profile.skin, -0.18), 255), 0.32);
}

function drawHairBack(c, p) {
  const cx = 256 + p.poseX;
  const cy = 220 + p.poseY;
  const hair = color(p.hair);
  const hairDark = rgba(shade(p.hair, -0.22), 255);
  const style = p.hairStyle;

  if ([2, 3, 5, 8, 9, 12, 14].includes(style)) {
    c.ellipse(cx - 60, cy + 32, 40, 96, hairDark, 0.88);
    c.ellipse(cx + 60, cy + 32, 40, 96, hairDark, 0.88);
  }
  if (style === 5 || style === 14) {
    c.ellipse(cx - 82, cy + 70, 30, 88, hair, 0.75);
    c.ellipse(cx + 82, cy + 70, 30, 88, hair, 0.75);
  }
  if (style === 7) {
    for (let i = 0; i < 13; i += 1) {
      const angle = (i / 13) * Math.PI * 2;
      c.ellipse(cx + Math.cos(angle) * 54, cy - 48 + Math.sin(angle) * 24, 28, 29, hair, 0.94);
    }
  }
  if (style === 10) {
    c.ellipse(cx - 72, cy - 16, 30, 36, hairDark, 0.9);
    c.ellipse(cx + 72, cy - 16, 30, 36, hairDark, 0.9);
  }
  if (style === 11) {
    c.polygon([[cx + 42, cy - 58], [cx + 138, cy - 22], [cx + 68, cy + 30]], hair, 0.9);
  }
}

function drawFaceBase(c, p) {
  const cx = 256 + p.poseX;
  const cy = 238 + p.poseY;
  const skin = color(p.skin);
  const shadow = rgba(shade(p.skin, -0.2), 255);
  const highlight = rgba(shade(p.skin, 0.15), 255);
  const scale = p.faceScale;
  const faceRx = (52 + (p.faceShape % 5) * 6 + (p.feminine ? 2 : 8)) * scale;
  const faceRy = (70 + (p.faceShape % 4) * 7 + (p.feminine ? 3 : 8)) * scale;
  const jaw = 30 + (p.faceShape % 6) * 7 + (p.feminine ? -2 : 7);

  c.ellipse(cx - faceRx - 4, cy + 14, 13, 24, shadow, 0.9);
  c.ellipse(cx + faceRx + 4, cy + 14, 13, 24, shadow, 0.9);
  c.ellipse(cx - faceRx - 3, cy + 14, 9, 18, skin, 0.92);
  c.ellipse(cx + faceRx + 3, cy + 14, 9, 18, skin, 0.92);

  c.ellipse(cx, cy, faceRx, faceRy, skin, 0.98);
  if (p.faceShape === 1 || p.faceShape === 4) {
    c.polygon([[cx - faceRx * 0.75, cy + 38], [cx + faceRx * 0.75, cy + 38], [cx + jaw * 0.55, cy + faceRy + 22], [cx, cy + faceRy + 36], [cx - jaw * 0.55, cy + faceRy + 22]], skin, 0.98);
  } else if (p.faceShape === 2 || p.faceShape === 6) {
    c.polygon([[cx - faceRx * 0.85, cy + 34], [cx + faceRx * 0.85, cy + 34], [cx + jaw, cy + faceRy + 18], [cx - jaw, cy + faceRy + 18]], skin, 0.98);
  } else {
    c.ellipse(cx, cy + faceRy * 0.52, jaw, 44, skin, 0.98);
  }
  c.ellipse(cx - faceRx * 0.34, cy + 18, 16, 9, highlight, 0.18);
  c.ellipse(cx + faceRx * 0.34, cy + 18, 16, 9, highlight, 0.12);
  c.line(cx + faceRx * 0.58, cy - 42, cx + faceRx * 0.72, cy + 42, 2, shadow, 0.24);
  if (p.faceShape === 0 || p.faceShape === 5) {
    c.ellipse(cx, cy + faceRy + 12, 19 + jaw * 0.16, 8, shadow, 0.18);
  }
  if (p.faceShape === 3 || p.faceShape === 6) {
    c.line(cx - faceRx * 0.62, cy + 42, cx - jaw * 0.56, cy + faceRy + 11, 2.2, shadow, 0.18);
    c.line(cx + faceRx * 0.62, cy + 42, cx + jaw * 0.56, cy + faceRy + 11, 2.2, shadow, 0.18);
  }
}

function drawHairFront(c, p) {
  const cx = 256 + p.poseX;
  const cy = 220 + p.poseY;
  const hair = color(p.hair);
  const hairDark = rgba(shade(p.hair, -0.26), 255);
  const hairLight = rgba(shade(p.hair, 0.22), 255);
  const style = p.hairStyle;

  if (style === 0) {
    c.ellipse(cx, cy - 58, 72, 42, hair, 0.96);
    c.polygon([[cx - 74, cy - 43], [cx - 10, cy - 78], [cx + 22, cy - 28]], hair, 0.94);
    c.line(cx - 56, cy - 42, cx + 46, cy - 62, 5, hairLight, 0.25);
  } else if (style === 1) {
    c.polygon([[cx - 78, cy - 34], [cx - 32, cy - 96], [cx + 50, cy - 88], [cx + 82, cy - 20], [cx + 22, cy - 44], [cx - 32, cy - 35]], hair, 0.96);
    c.polygon([[cx - 42, cy - 82], [cx + 12, cy - 10], [cx - 18, cy - 22]], hairDark, 0.62);
  } else if (style === 2) {
    c.ellipse(cx, cy - 48, 78, 38, hair, 0.95);
    for (let i = 0; i < 8; i += 1) c.line(cx - 66 + i * 19, cy - 52, cx - 86 + i * 22, cy + 88, 9, hair, 0.76);
  } else if (style === 3) {
    c.rect(cx - 76, cy - 88, 152, 70, hair, 0.96, 18);
    c.line(cx - 62, cy - 50, cx + 54, cy - 54, 6, hairLight, 0.2);
  } else if (style === 4) {
    for (let i = 0; i < 9; i += 1) {
      const x = cx - 64 + i * 16;
      c.polygon([[x - 22, cy - 32], [x + 10, cy - 32], [x - 4 + (i % 2) * 9, cy + 34]], hair, 0.96);
    }
    c.ellipse(cx, cy - 54, 76, 34, hair, 0.95);
  } else if (style === 5) {
    c.ellipse(cx, cy - 54, 82, 42, hair, 0.96);
    c.line(cx - 70, cy - 22, cx - 88, cy + 120, 13, hairDark, 0.82);
    c.line(cx + 70, cy - 22, cx + 88, cy + 120, 13, hairDark, 0.82);
  } else if (style === 6) {
    c.ellipse(cx, cy - 54, 76, 31, hair, 0.9);
    c.rect(cx - 78, cy - 68, 156, 25, hairDark, 0.92, 10);
    c.line(cx - 66, cy - 54, cx + 64, cy - 42, 5, color(p.accent), 0.46);
  } else if (style === 7) {
    for (let i = 0; i < 15; i += 1) {
      c.ellipse(cx - 66 + (i % 5) * 33, cy - 72 + Math.floor(i / 5) * 22, 20, 20, hair, 0.96);
    }
  } else if (style === 8) {
    c.ellipse(cx, cy - 58, 78, 44, hair, 0.95);
    c.ellipse(cx - 72, cy - 6, 26, 84, hair, 0.88);
    c.ellipse(cx + 72, cy - 6, 26, 84, hair, 0.88);
  } else if (style === 9) {
    c.ellipse(cx, cy - 52, 84, 43, hair, 0.95);
    c.polygon([[cx + 10, cy - 78], [cx + 82, cy - 30], [cx + 10, cy + 32]], hair, 0.92);
  } else if (style === 10) {
    c.ellipse(cx - 51, cy - 64, 28, 28, hair, 0.95);
    c.ellipse(cx + 51, cy - 64, 28, 28, hair, 0.95);
    c.ellipse(cx, cy - 44, 70, 34, hair, 0.92);
  } else if (style === 11) {
    c.ellipse(cx, cy - 60, 68, 32, hair, 0.94);
    c.line(cx + 64, cy - 18, cx + 128, cy + 110, 17, hair, 0.78);
    c.line(cx + 128, cy + 110, cx + 94, cy + 136, 12, hairLight, 0.32);
  } else if (style === 12) {
    for (let i = 0; i < 10; i += 1) c.line(cx - 68 + i * 15, cy - 64, cx - 84 + i * 18, cy + 92, 6, hair, 0.88);
    c.ellipse(cx, cy - 63, 72, 30, hair, 0.88);
  } else if (style === 13) {
    c.rect(cx - 86, cy - 66, 172, 32, hair, 0.94, 9);
    c.rect(cx - 58, cy - 104, 116, 54, hairDark, 0.94, 10);
  } else if (style === 14) {
    c.ellipse(cx, cy - 52, 82, 46, hair, 0.95);
    c.line(cx - 74, cy - 16, cx - 104, cy + 98, 15, hair, 0.72);
    c.line(cx + 74, cy - 16, cx + 104, cy + 98, 15, hair, 0.72);
    c.line(cx - 36, cy - 52, cx - 10, cy + 34, 9, hairLight, 0.24);
  } else {
    c.ellipse(cx, cy - 58, 72, 34, hair, 0.92);
    c.polygon([[cx - 62, cy - 44], [cx + 42, cy - 78], [cx + 70, cy - 32], [cx - 20, cy - 16]], hair, 0.92);
  }
}

function drawEyes(c, p) {
  const cx = 256 + p.poseX;
  const cy = 238 + p.poseY;
  const accent = color(p.accent);
  const eye = color(p.eye);
  const dark = color("#08090B");
  const leftX = cx - (34 + (p.faceShape % 3) * 2);
  const rightX = cx + (34 + (p.faceShape % 3) * 2);
  const eyeY = cy + 2 + (p.expression % 3) * 2;
  const eyeW = (p.feminine ? 17 : 15) + (p.eyeShape === 4 ? 4 : 0) - (p.eyeShape === 2 ? 2 : 0);
  const eyeH = p.eyeShape === 1 ? 12 : p.eyeShape === 2 || p.expression === 4 ? 6 : p.eyeShape === 4 ? 13 : 9;
  const pupilOffset = p.expression === 1 ? 3 : p.expression === 5 ? -2 : 0;
  const browLift = p.expression === 3 ? -6 : p.expression === 5 ? 7 : 0;
  const browTilt = ((p.expression + p.eyeShape) % 3 - 1) * 5;

  c.line(leftX - 22, eyeY - 18 + browLift, leftX + 19, eyeY - 20 + browLift + browTilt, 4.2, dark, 0.48);
  c.line(rightX - 19, eyeY - 20 + browLift - browTilt, rightX + 22, eyeY - 18 + browLift, 4.2, dark, 0.48);

  if (p.expression === 6 || p.eyeShape === 5) {
    c.line(leftX - 14, eyeY, leftX + 14, eyeY + 4, 4, dark, 0.7);
    c.line(rightX - 14, eyeY + 4, rightX + 14, eyeY, 4, dark, 0.7);
    if (p.feminine) {
      c.line(leftX - 15, eyeY - 2, leftX - 21, eyeY - 7, 1.6, dark, 0.34);
      c.line(rightX + 15, eyeY - 2, rightX + 21, eyeY - 7, 1.6, dark, 0.34);
    }
    return;
  }

  if (p.eyeShape === 0 || p.eyeShape === 3) {
    c.polygon([[leftX - eyeW, eyeY], [leftX - 2, eyeY - eyeH], [leftX + eyeW, eyeY], [leftX + 1, eyeY + eyeH]], color("#F8FAFC"), 0.94);
    c.polygon([[rightX - eyeW, eyeY], [rightX - 1, eyeY - eyeH], [rightX + eyeW, eyeY], [rightX + 2, eyeY + eyeH]], color("#F8FAFC"), 0.94);
  } else {
    c.ellipse(leftX, eyeY, eyeW, eyeH, color("#F8FAFC"), 0.94);
    c.ellipse(rightX, eyeY, eyeW, eyeH, color("#F8FAFC"), 0.94);
  }
  c.ellipse(leftX + pupilOffset, eyeY + 1, p.eyeShape === 4 ? 7.2 : 6.2, p.eyeShape === 2 ? 5.6 : 7.6, eye, 0.98);
  c.ellipse(rightX + pupilOffset, eyeY + 1, p.eyeShape === 4 ? 7.2 : 6.2, p.eyeShape === 2 ? 5.6 : 7.6, eye, 0.98);
  c.ellipse(leftX + pupilOffset, eyeY + 1, 2.8, 4.4, dark, 0.98);
  c.ellipse(rightX + pupilOffset, eyeY + 1, 2.8, 4.4, dark, 0.98);
  c.ellipse(leftX + 3, eyeY - 3, 2, 2, color("#FFFFFF"), 0.75);
  c.ellipse(rightX + 3, eyeY - 3, 2, 2, color("#FFFFFF"), 0.75);
  if (p.feminine || p.eyeShape === 4) {
    c.line(leftX - eyeW, eyeY - 3, leftX - eyeW - 7, eyeY - 9, 1.8, dark, 0.42);
    c.line(rightX + eyeW, eyeY - 3, rightX + eyeW + 7, eyeY - 9, 1.8, dark, 0.42);
  }

  if (p.vibe === "ai" || p.vibe === "cyberpunk") {
    c.line(leftX - 18, eyeY + 14, leftX + 18, eyeY + 14, 2, accent, 0.34);
    c.line(rightX - 18, eyeY + 14, rightX + 18, eyeY + 14, 2, accent, 0.34);
  }
}

function drawFeatures(c, p) {
  const cx = 256 + p.poseX;
  const cy = 238 + p.poseY;
  const skinShadow = rgba(shade(p.skin, -0.28), 255);
  const blush = color(p.feminine ? "#FF6B8A" : "#F59E8B");
  const lip = color(p.feminine ? "#8E2A4C" : "#5B1F1F");
  const facial = rgba(shade(p.hair, -0.36), 255);
  const mark = color(p.accent2);
  const noseX = cx - 3 + (p.faceShape % 3) * 3;

  if (p.noseShape === 0) {
    c.line(noseX + 2, cy + 13, noseX - 5, cy + 45, 2.6, skinShadow, 0.32);
    c.ellipse(noseX - 5, cy + 49, 5, 2.2, skinShadow, 0.24);
    c.ellipse(noseX + 8, cy + 49, 5, 2.2, skinShadow, 0.2);
  } else if (p.noseShape === 1) {
    c.line(noseX, cy + 11, noseX + 3, cy + 43, 3, skinShadow, 0.26);
    c.line(noseX + 2, cy + 43, noseX + 14, cy + 49, 2, skinShadow, 0.2);
  } else if (p.noseShape === 2) {
    c.polygon([[noseX - 4, cy + 22], [noseX + 11, cy + 48], [noseX - 10, cy + 48]], skinShadow, 0.13);
    c.ellipse(noseX, cy + 50, 12, 3.5, skinShadow, 0.2);
  } else if (p.noseShape === 3) {
    c.line(noseX + 5, cy + 13, noseX + 10, cy + 45, 2.2, skinShadow, 0.24);
    c.ellipse(noseX + 4, cy + 49, 13, 3.5, skinShadow, 0.18);
  } else {
    c.line(noseX - 4, cy + 17, noseX - 9, cy + 42, 2, skinShadow, 0.22);
    c.line(noseX - 8, cy + 44, noseX + 9, cy + 48, 2.2, skinShadow, 0.22);
  }

  c.ellipse(cx - 44, cy + 39, 14, 7, blush, p.feminine ? 0.16 : 0.08);
  c.ellipse(cx + 44, cy + 39, 14, 7, blush, p.feminine ? 0.16 : 0.08);
  if (p.faceMark === 1 || p.faceMark === 6) {
    for (let i = 0; i < 5; i += 1) {
      c.ellipse(cx - 49 + i * 7, cy + 35 + (i % 2) * 5, 1.9, 1.9, skinShadow, 0.28);
      c.ellipse(cx + 21 + i * 7, cy + 37 + ((i + 1) % 2) * 5, 1.7, 1.7, skinShadow, 0.2);
    }
  } else if (p.faceMark === 2) {
    c.ellipse(cx + 39, cy + 58, 3.2, 3.2, color("#2A1714"), 0.42);
  } else if (p.faceMark === 3) {
    c.line(cx + 31, cy - 2, cx + 48, cy + 26, 2, mark, 0.32);
    c.line(cx + 34, cy + 9, cx + 45, cy + 7, 1.4, color("#FFFFFF"), 0.24);
  } else if (p.faceMark === 4 || p.faceMark === 8) {
    c.line(cx - 55, cy + 54, cx - 29, cy + 45, 2.4, mark, 0.26);
  } else if (p.faceMark === 5) {
    c.ellipse(cx - 28, cy + 28, 3.2, 3.2, mark, 0.32);
    c.ellipse(cx + 31, cy + 28, 3.2, 3.2, mark, 0.26);
  }

  if (p.expression === 0) {
    c.line(cx - 27, cy + 78, cx + 27, cy + 78, 3, lip, 0.44);
  } else if (p.expression === 1) {
    c.line(cx - 28, cy + 75, cx + 26, cy + 68, 3, lip, 0.5);
  } else if (p.expression === 2) {
    c.ellipse(cx, cy + 76, 24, p.feminine ? 10 : 8, lip, p.feminine ? 0.36 : 0.28);
    c.line(cx - 21, cy + 74, cx + 21, cy + 74, 2, lip, 0.44);
  } else if (p.expression === 3) {
    c.line(cx - 26, cy + 72, cx - 3, cy + 80, 3, lip, 0.48);
    c.line(cx - 3, cy + 80, cx + 27, cy + 70, 3, lip, 0.48);
  } else if (p.expression === 4) {
    c.line(cx - 24, cy + 80, cx + 24, cy + 74, 3, lip, 0.42);
  } else if (p.expression === 5) {
    c.line(cx - 28, cy + 75, cx + 28, cy + 83, 3, lip, 0.42);
  } else if (p.expression === 6) {
    c.ellipse(cx, cy + 76, 12, 10, lip, 0.28);
  } else {
    c.line(cx - 28, cy + 76, cx + 28, cy + 76, 2.4, lip, 0.36);
    c.line(cx + 13, cy + 75, cx + 24, cy + 69, 2, lip, 0.34);
  }

  if (!p.feminine && p.facialHair > 0) {
    if ([1, 3, 5, 6].includes(p.facialHair)) {
      c.ellipse(cx - 14, cy + 63, 17, 6, facial, 0.42);
      c.ellipse(cx + 14, cy + 63, 17, 6, facial, 0.42);
      c.line(cx - 27, cy + 64, cx + 27, cy + 64, 2, facial, 0.28);
    }
    if ([2, 4, 5, 6].includes(p.facialHair)) {
      c.ellipse(cx, cy + 94, 34 + (p.seed % 20), 24, facial, p.facialHair === 6 ? 0.34 : 0.22);
      c.line(cx - 42, cy + 78, cx - 24, cy + 105, 5, facial, 0.18);
      c.line(cx + 42, cy + 78, cx + 24, cy + 105, 5, facial, 0.18);
    }
    if (p.facialHair === 3 || p.facialHair === 6) {
      c.ellipse(cx, cy + 84, 10, 20, facial, 0.34);
    }
  }
}

function drawAccessories(c, p) {
  const cx = 256 + p.poseX;
  const cy = 238 + p.poseY;
  const accent = color(p.accent);
  const accent2 = color(p.accent2);
  const dark = color("#050505");
  const leftX = cx - 36;
  const rightX = cx + 36;
  const eyeY = cy + 4 + (p.expression % 3) * 2;

  if (p.accessory === 0 || (p.vibe === "professional" && p.seed % 2 === 0)) {
    c.ring(leftX, eyeY, 22, 14, 3, color("#FFFFFF"), 0.58);
    c.ring(rightX, eyeY, 22, 14, 3, color("#FFFFFF"), 0.58);
    c.line(leftX + 21, eyeY, rightX - 21, eyeY, 2, color("#FFFFFF"), 0.42);
  }
  if (p.accessory === 1 || (p.vibe === "gaming" && p.seed % 3 !== 1)) {
    c.rect(cx - 92, cy - 14, 20, 72, color("#101820"), 0.88, 10);
    c.rect(cx + 72, cy - 14, 20, 72, color("#101820"), 0.88, 10);
    c.ring(cx, cy + 8, 104, 88, 5, accent, 0.17);
    c.line(cx + 88, cy + 48, cx + 122, cy + 72, 4, accent, 0.58);
  }
  if (p.accessory === 2 || (p.vibe === "street" && p.seed % 3 === 0)) {
    c.rect(cx - 85, cy - 96, 170, 21, dark, 0.86, 6);
    c.rect(cx - 60, cy - 139, 120, 52, dark, 0.92, 10);
    c.line(cx - 58, cy - 89, cx + 58, cy - 89, 4, accent, 0.58);
  }
  if (p.accessory === 3 || (p.vibe === "mythology" && p.seed % 2 === 0)) {
    c.ring(cx, cy - 118, 58, 13, 3, accent2, 0.62);
    c.ellipse(cx, cy - 118, 7, 7, accent, 0.7);
  }
  if (p.accessory === 4 || (p.vibe === "fantasy" && p.seed % 2 === 0)) {
    c.line(cx - 72, cy - 44, cx - 116, cy - 76, 4, accent2, 0.7);
    c.line(cx + 72, cy - 44, cx + 116, cy - 76, 4, accent2, 0.7);
  }
  if (p.accessory === 5 || ((p.vibe === "cyberpunk" || p.vibe === "ai") && p.seed % 2 === 0)) {
    c.line(cx - 86, cy - 2, cx - 54, cy - 2, 8, accent, 0.68);
    c.line(cx + 54, cy - 2, cx + 86, cy - 2, 8, accent, 0.68);
    c.line(cx - 92, cy + 20, cx - 68, cy + 48, 2.5, accent2, 0.58);
  }
  if (p.accessory === 6 || (p.vibe === "hero" && p.seed % 3 !== 0)) {
    c.line(cx - 48, cy - 24, cx + 48, cy - 24, 8, accent, 0.48);
    c.line(cx - 46, cy - 23, cx - 12, cy - 16, 3, color("#FFFFFF"), 0.26);
    c.line(cx + 12, cy - 16, cx + 46, cy - 23, 3, color("#FFFFFF"), 0.26);
  }
  if (p.accessory === 7 || (p.vibe === "villain" && p.seed % 3 !== 1)) {
    c.line(cx - 74, cy + 20, cx + 70, cy + 92, 3, accent, 0.34);
    c.ellipse(cx + 54, cy - 6, 20, 20, accent, 0.14);
  }
  if (p.accessory === 8 || (p.vibe === "sports" && p.seed % 3 !== 2)) {
    c.rect(cx - 70, cy - 94, 140, 24, accent, 0.72, 10);
    c.line(cx - 48, cy - 82, cx + 48, cy - 82, 3, color("#FFFFFF"), 0.28);
  }
  if (p.accessory === 9 && p.feminine) {
    c.ellipse(cx - 76, cy + 42, 6, 10, accent2, 0.82);
    c.ellipse(cx + 76, cy + 42, 6, 10, accent2, 0.82);
  }
  if (p.accessory === 10 || (p.vibe === "seasonal" && p.seed % 2 === 0)) {
    c.ellipse(cx + 96, cy - 70, 17, 17, accent, 0.22);
    c.ring(cx + 96, cy - 70, 20, 20, 3, accent, 0.68);
  }
  if (p.accessory === 11 || (p.vibe === "meme" && p.seed % 2 === 0)) {
    c.line(cx - 74, cy - 35, cx - 32, cy - 48, 4, accent2, 0.46);
    c.line(cx + 34, cy - 48, cx + 76, cy - 35, 4, accent2, 0.46);
  }
  if (p.accessory === 12 || (p.vibe === "space" && p.seed % 3 !== 1)) {
    c.ring(cx, cy + 2, 108, 116, 6, color("#DDE5EA"), 0.26);
    c.line(cx - 92, cy + 8, cx + 92, cy - 8, 5, accent, 0.32);
  }
}

function drawAnimatedHuman(c, category, p, rng) {
  drawBackdrop(c, category, p, rng);
  drawShoulders(c, p);
  drawHairBack(c, p);
  drawFaceBase(c, p);
  drawEyes(c, p);
  drawFeatures(c, p);
  drawHairFront(c, p);
  drawAccessories(c, p);
  c.ring(256, 256, 246, 246, 2, color("#FFFFFF"), 0.18);
}

function renderAvatar(category, index, attempt = 0) {
  const profile = createProfile(category, index, attempt);
  const rng = mulberry32(hashString(`${profile.id}:${attempt}:portrait-v2`));
  const c = new Canvas(SIZE);
  drawAnimatedHuman(c, category, profile, rng);
  return {
    id: profile.id,
    archetype: profile.archetype,
    gender: profile.gender,
    buffer: Buffer.from(c.data.buffer),
  };
}

async function encodeWebp(rawBuffer, outFile) {
  const image = sharp(rawBuffer, {
    raw: {
      width: SIZE,
      height: SIZE,
      channels: 4,
    },
  });
  const pipeline = SIZE === OUTPUT_SIZE ? image : image.resize(OUTPUT_SIZE, OUTPUT_SIZE, { kernel: "lanczos3" });
  await pipeline.webp({ quality: 90, effort: 3 }).toFile(outFile);
}

function perceptualHash(rawBuffer) {
  const pixels = new Uint8ClampedArray(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
  const values = [];
  const step = SIZE / HASH_SIZE;

  for (let y = 0; y < HASH_SIZE; y += 1) {
    for (let x = 0; x < HASH_SIZE; x += 1) {
      const px = Math.min(SIZE - 1, Math.floor((x + 0.5) * step));
      const py = Math.min(SIZE - 1, Math.floor((y + 0.5) * step));
      const idx = (py * SIZE + px) * 4;
      const alpha = pixels[idx + 3] / 255;
      const luminance = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) * alpha;
      values.push(luminance);
    }
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => (value > average ? "1" : "0")).join("");
}

function hashSimilarity(left, right) {
  let same = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) same += 1;
  }
  return same / left.length;
}

function maxSimilarityFor(hash, hashes) {
  let maxSimilarity = 0;
  const candidates = hashes.length > MAX_HASH_COMPARISONS ? hashes.slice(-MAX_HASH_COMPARISONS) : hashes;
  for (const existing of candidates) {
    maxSimilarity = Math.max(maxSimilarity, hashSimilarity(hash, existing.hash));
  }
  return maxSimilarity;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];
  const hashes = [];
  let total = 0;

  for (const category of categories) {
    for (let i = 0; i < category.count; i += 1) {
      let avatar = renderAvatar(category, i);
      let hash = perceptualHash(avatar.buffer);
      let maxSimilarity = maxSimilarityFor(hash, hashes);
      let attempts = 1;

      while (maxSimilarity > MAX_PERCEPTUAL_SIMILARITY && attempts < MAX_RENDER_ATTEMPTS) {
        avatar = renderAvatar(category, i, attempts);
        hash = perceptualHash(avatar.buffer);
        maxSimilarity = maxSimilarityFor(hash, hashes);
        attempts += 1;
      }

      const outFile = path.join(OUT_DIR, `${avatar.id}.webp`);
      await encodeWebp(avatar.buffer, outFile);
      hashes.push({ id: avatar.id, hash });
      manifest.push({
        id: avatar.id,
        category: category.id,
        archetype: avatar.archetype,
        gender: avatar.gender,
        url: `/avatars/ragebait/${avatar.id}.webp`,
        quality: {
          perceptualHash: hash,
          maxSimilarity: Number(maxSimilarity.toFixed(3)),
          renderAttempts: attempts,
        },
      });
      total += 1;
      if (total % 25 === 0) process.stdout.write(`Generated ${total} avatars...\n`);
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), style: "animated-human-v2", count: total, avatars: manifest }, null, 2)
  );
  process.stdout.write(`Generated ${total} animated human Ragebait avatars in ${OUT_DIR}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
