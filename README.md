<div align="center">

# ⚔️ RAGEBAIT

### Words are the weapon. RageMind is the arena.

**An AI-judged competitive battle platform** — roast, debate, and outwit real opponents while a fully self-hosted AI brain judges every exchange, explains every verdict, and turns conversation into combat.

🔗 **Live:** [ragebait-v5.vercel.app](https://ragebait-v5.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js%2014-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-38BDF8?logo=tailwindcss&logoColor=white) ![Postgres](https://img.shields.io/badge/Neon%20Postgres-336791?logo=postgresql&logoColor=white) ![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)

</div>

---

## What is Ragebait?

Ragebait is not a chat app. It's a **battle system** where two players fight with language — roasts, comebacks, logic, callbacks, wit — and an AI referee called **RageMind** judges the entire conversation: who countered, who recycled material, who controlled the momentum, and who deserves the win.

Every verdict is **explainable**. No black-box scoring — the judge tells you the strongest argument, the best comeback, the turning point, and exactly why the winner won.

## ⚔️ The Battle Arena

The battle loop is built as a **game**, not a message thread:

- **Timed exchanges** — every turn runs on a clock; the challenger opens, turns alternate volley-for-volley, and silence has consequences (the referee notes it and the turn passes)
- **Momentum, not HP** — a psychological-control axis tracks pressure, initiative, and dominance: *"The challenger controls the battlefield." "The defender is pinned on the defensive."*
- **Semantic impact synthesis** — the arena reacts to what your words actually *did*: a strike that dismantles the opponent's last attack fires `strong_counter`; resurrecting an earlier line fires `callback`; repeating yourself fires `recycled_line` and fizzles
- **Live caster commentary** — RageMind calls the action strike by strike
- **One source of truth** — live momentum runs the *exact same* evaluation pipeline as the final verdict, so the live reading and the judgment can never disagree

## 🧠 RageMind X — a fully local AI brain

**Zero external AI APIs.** No OpenAI, no hosted inference — every judgment runs on a self-contained reasoning stack:

| Layer | What it does |
|---|---|
| **Engine stack** | Intent, slang, meme, emotion, language, memory, audience & reasoning engines analyze the full transcript |
| **Conversation graph** | Detects direct counters, callbacks, reused jokes, and unanswered attacks |
| **Judge panel** | Five judging personas score independently; the final score is their consensus |
| **Score fusion** | A provenance layer traces every category score back to the module that produced it |
| **Explainability** | Verdict, confidence, strongest argument, best comeback, turning point — for every battle |
| **Self-tests** | Fixture battles with known winners guard against judge regressions on every change |

**Multilingual by design** — English, Hindi, Hinglish, and Telugu / Tamil / Kannada / Malayalam written in Latin script (*"Bro nuvvu serious aa?"*, *"Enna da macha"*), judged by meaning, not word-by-word translation.

**Moderation with context** — trash talk and profanity between competitors are fair play; harassment, hate, caste/religious/gender abuse, threats, and doxxing are not. The moderator reads the whole conversation before ruling, and enforcement escalates from warnings to cooldowns to suspensions.

## ✨ More than battles

- **Aura economy** — win +100 Aura; earn bonuses for Strong Comebacks, Creative Arguments, Excellent Humor, and being the Audience Favorite; low-effort spam costs you
- **AI Coach** — post-battle personal coaching: strengths, weaknesses, repeated patterns, and a practice goal, tracked battle over battle
- **Leaderboards, profiles, groups, invites** — ranked identity built on how you actually fight
- **Founder Command Center** — a live-ops dashboard with user management, live battle control, reports, broadcasts, an AI Studio (judge weights & knowledge base editable at runtime, versioned), and an immutable audit log
- **Real legal rails** — versioned Terms & Conditions with mandatory, evidence-logged acceptance at registration

## 🏗️ Architecture

```
Next.js 14 (App Router) ── Tailwind glassmorphism UI
        │
        ├── /api/battles/*        Battle Engine (transport-agnostic, pure functions)
        │        └── resolveStrike ─→ evaluateBattleTranscript  ←─ the ONE judge
        ├── /api/battles/[id]/judge      Final verdict + Aura + coaching
        ├── /api/creator/*        Founder ops (server-side gated, audit-logged)
        │
        └── Neon Postgres ── battles · strikes(impact JSONB) · aura ledger ·
                             moderation logs · AI rules & knowledge · audit trails
```

Design principles: **deterministic** (same transcript → same verdict), **explainable** (every score traceable), **local-first AI** (no API keys required to judge), **transport-agnostic** (async relay today, live duels as a pure transport upgrade).

## 🚀 Getting started

```bash
git clone https://github.com/divyesh8/RageBait.git
cd RageBait
npm install
```

Create `.env.local`:

```env
DATABASE_URL=postgresql://...      # Neon/Postgres
JWT_SECRET=your-secret
FOUNDER_EMAIL=you@example.com      # unlocks the Creator Control Panel
EMAIL_SERVER_HOST=...              # SMTP for signup OTP emails
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=...
EMAIL_SERVER_PASSWORD=...
EMAIL_FROM=Ragebait <no-reply@...>
```

Apply the schema, then migrations in order:

```bash
psql $DATABASE_URL -f db/schema.sql
# then each db/migration_*.sql in ascending order
```

```bash
npm run dev
```

## 🗺️ Roadmap

- **Arena UI** — the Momentum Core, exchange clock, and semantic-event presentation layer (backend is live; themes map events → visuals)
- **Auto-judge** — verdict fires the instant the final strike lands
- **Stances & Rage Meter** — declared intent and risk/reward, never a substitute for language quality
- **Spectators & replays** — crowd atmosphere, highlights, shareable verdict cards
- **Signature Titles** — RageMind studies how you fight and names you for it: *Precision Destroyer. Callback King. Deadpan Assassin.* Earned, never chosen — and they evolve as you do.

---

<div align="center">

**Words are the weapon. RageMind is the arena. Players earn their reputation through the way they fight.**

</div>
