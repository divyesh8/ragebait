"use client";

import { useEffect, useState, useCallback } from "react";
import type { Gender } from "@/lib/gender";

export interface CurrentUser {
  id: string;
  userId: string;
  username: string;
  email: string;
  gender: Gender | null;
  showGenderOnPublicProfile: boolean;
  aura: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
  bio: string | null;
  avatar_url: string | null;
  country: string;
  languages: string[];
  favoriteBattleCategory: string;
  profileVisibility: "public" | "partners" | "private";
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  partnerRequestPolicy: "anyone" | "partners_only" | "nobody";
  lastActiveAt: string | null;
  currentActivity: string;
  created_at: string;
  isCreator: boolean;
}

// ─── Module-level singleton ───────────────────────────────────────────────────
// All components share one cached value and one in-flight request.
// This means the Navbar and Profile page never race each other.

type Listener = (user: CurrentUser | null) => void;

let cachedUser: CurrentUser | null = null;
let fetchState: "idle" | "loading" | "done" = "idle";
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify(user: CurrentUser | null) {
  listeners.forEach((fn) => fn(user));
}

function fetchMe(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  fetchState = "loading";
  fetchPromise = fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    })
    .then((data) => {
      cachedUser = data.user ?? null;
    })
    .catch(() => {
      cachedUser = null;
    })
    .finally(() => {
      fetchState = "done";
      fetchPromise = null;
      notify(cachedUser);
    });

  return fetchPromise;
}

// Call this after logout to clear state and notify all listeners
export function invalidateUserCache() {
  cachedUser = null;
  fetchState = "idle";
  fetchPromise = null;
  notify(null);
}

// Call this after login/signup: clears state, re-fetches, then notifies
// Returns a promise that resolves once the fresh user data is loaded
export async function refreshUserCache(): Promise<CurrentUser | null> {
  cachedUser = null;
  fetchState = "idle";
  fetchPromise = null;
  // Notify null immediately so UI can show loading state
  notify(null);
  // Now fetch fresh data
  await fetchMe();
  return cachedUser;
}

// Call this after focused profile mutations that already returned the fresh value.
// It keeps Navbar, Sidebar, profile cards, and any open views in sync immediately.
export function updateCurrentUserCache(patch: Partial<CurrentUser>) {
  if (!cachedUser) return null;
  cachedUser = { ...cachedUser, ...patch };
  fetchState = "done";
  notify(cachedUser);
  return cachedUser;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(fetchState !== "done");

  const refresh = useCallback(async () => {
    // Force a fresh fetch by resetting state
    cachedUser = null;
    fetchState = "idle";
    fetchPromise = null;
    setLoading(true);
    await fetchMe();
    setUser(cachedUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Subscribe to future updates
    const listener: Listener = (u) => {
      setUser(u);
      setLoading(false);
    };
    listeners.add(listener);

    // If we already have a result, use it immediately
    if (fetchState === "done") {
      setUser(cachedUser);
      setLoading(false);
    } else {
      // Kick off fetch (or join existing in-flight one)
      fetchMe();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { user, loading, refresh };
}
