# Ragebait

> Win the roast. Claim the Aura.

An AI-powered competitive social platform for roast battles, debates, meme
wars, and community challenges. This repo contains the **frontend starter** —
a Next.js + TypeScript + Tailwind scaffold matching the Ragebait design spec
(dark futuristic theme, Aura reputation system, battles, leaderboards, rage
groups, profiles).

## What's included

- Landing page (hero, live battles, features, leaderboard preview, topics, CTA)
- `/battles` — battle listings (casual, ranked, tournament, group, event)
- `/leaderboard` — global rankings by Aura
- `/profile` — user profile, stats, achievements, Aura history
- `/groups` — Rage Groups (communities)
- `/login`, `/signup` — **working auth**, backed by Postgres (Neon) + JWT sessions
- Shared UI kit: `Button`, `Card`, `AuraBadge`
- Mock data layer (`src/lib/mockData.ts`) standing in for battles/leaderboard/groups data
- Dark, neon-purple / electric-blue / crimson theme via Tailwind tokens

## Setting up authentication (required)

Login and signup need a Postgres database and a JWT secret.

### 1. Create a database

In your Vercel project dashboard:

1. Go to **Storage → Create Database → Postgres** (powered by Neon).
2. Connect it to your project. Vercel automatically adds a `DATABASE_URL`
   environment variable to your project — no manual copy/paste needed.

If you're using Neon directly (not via Vercel's integration), copy the
connection string from the Neon dashboard and add it as `DATABASE_URL` in
**Vercel → Project Settings → Environment Variables**.

### 2. Run the schema

Run `db/schema.sql` against your database once. Easiest ways:

- **Neon SQL Editor**: open your project in [neon.tech](https://neon.tech),
  paste the contents of `db/schema.sql`, run it.
- **psql**: `psql "$DATABASE_URL" -f db/schema.sql`

This creates the `users` table used by signup/login.

### 3. Add a JWT secret

In **Vercel → Project Settings → Environment Variables**, add:

```
JWT_SECRET=<a long random string>
```

Generate one with `openssl rand -base64 32`.

### 4. Redeploy

After adding env vars, trigger a new deployment (Vercel → Deployments →
**Redeploy**, or push a commit) so the functions pick up the new variables.

### How it works

- `POST /api/auth/signup` — validates input (zod), checks for duplicate
  username/email, hashes the password (bcrypt), creates the user, sets a
  signed JWT session cookie.
- `POST /api/auth/login` — looks up user by username or email, verifies
  password, sets the session cookie. Returns `"Account not found."` or
  `"Please enter the correct password."` per the spec's error messages.
- `POST /api/auth/logout` — clears the session cookie.
- `GET /api/auth/me` — returns the current user from the session cookie, or
  `null`.
- Email OTP verification is **not yet implemented** — accounts are created
  as verified-by-default for now (see comments in `api/auth/login/route.ts`
  for where to enable the check once OTP exists).

## Not included yet (per the spec's roadmap)

Email OTP verification, Redis caching, Socket.IO real-time chat, Cloudinary
uploads, tournaments, and expanded analytics. RageMind X local AI modules now
cover judging and moderation without external AI services.

## Getting started locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### Option A — via GitHub (recommended)

1. Push this folder to a new GitHub repository.
2. In Vercel, click **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected). No env vars are required
   for this starter — it runs entirely on mock data.
4. Click **Deploy**.

### Option B — via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel        # preview deploy
vercel --prod # production deploy
```

## Environment variables

Copy `.env.example` to `.env.local` when you start wiring up the real backend
(database, Redis, Cloudinary, email/OTP). No external AI provider key is
required.

## Project structure

```
db/
  schema.sql      # Postgres schema (users table)
src/
  app/            # Next.js App Router pages
    api/auth/     # signup, login, logout, me — route handlers
    battles/
    groups/
    leaderboard/
    login/
    profile/
    signup/
    layout.tsx
    page.tsx
    globals.css
  components/
    auth/         # LoginForm, SignupForm (client components)
    layout/       # Navbar, Footer
    ui/           # Button, Card, AuraBadge
  lib/
    auth.ts       # JWT sign/verify helpers
    db.ts         # Neon Postgres connection
    validation.ts # zod schemas for signup/login
    mockData.ts   # Placeholder data for battles/leaderboard/groups
  types/
    index.ts      # Shared TypeScript interfaces (User, Battle, AI scores, etc.)
```

## Next modules to build (suggested order)

1. Email OTP verification for signup
2. Real-time chat (Socket.IO) + private/group messaging
3. Expand RageMind X local judge/moderation fixtures and creator dashboards
4. Aura economy persistence + Aura history (replace mock data)
5. Tournaments + seasons
6. Admin dashboard + analytics
