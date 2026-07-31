"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import {
  AVATAR_CATEGORIES,
  AVATAR_FRAMES,
  AVATAR_OPTIONS,
  AVATAR_RARITIES,
  AVATAR_TOTAL,
  STATUS_BADGES,
  createRandomIdentity,
  getAvatarFrame,
  getAvatarRarityInfo,
  resolveAvatarFromUrl,
  type AvatarCategoryId,
  type AvatarOption,
} from "@/lib/avatars";

interface AvatarPickerProps {
  currentAvatarUrl: string;
  onSelected: (newAvatarUrl: string, avatar?: AvatarOption) => void;
  onClose: () => void;
}

type BrowserTab = "all" | "trending" | "new" | "favorites" | "recent" | AvatarCategoryId;
type PickerNotice = { type: "success" | "error"; message: string } | null;

const FAVORITES_KEY = "ragebait.avatarFavorites";
const RECENT_KEY = "ragebait.recentAvatars";
const GRID_ROW_HEIGHT = 138;
const GRID_MAX_HEIGHT = 456;

const browserTabs: { id: BrowserTab; label: string; count: number }[] = [
  { id: "all", label: "All", count: AVATAR_TOTAL },
  { id: "trending", label: "Trending", count: AVATAR_OPTIONS.filter((avatar) => avatar.isTrending).length },
  { id: "new", label: "New", count: AVATAR_OPTIONS.filter((avatar) => avatar.isNew).length },
  { id: "favorites", label: "Favorites", count: 0 },
  { id: "recent", label: "Recent", count: 0 },
  ...AVATAR_CATEGORIES.map((category) => ({ id: category.id, label: category.label, count: category.count })),
];

export default function AvatarPicker({ currentAvatarUrl, onSelected, onClose }: AvatarPickerProps) {
  const currentAvatar = useMemo(() => resolveAvatarFromUrl(currentAvatarUrl), [currentAvatarUrl]);
  const avatarMap = useMemo(() => new Map(AVATAR_OPTIONS.map((avatar) => [avatar.id, avatar])), []);
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatar?.id ?? null);
  const [committedId, setCommittedId] = useState<string | null>(currentAvatar?.id ?? null);
  const [activeTab, setActiveTab] = useState<BrowserTab>("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<PickerNotice>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [randomIdentity, setRandomIdentity] = useState(() => createRandomIdentity(AVATAR_TOTAL + 37));
  const [gridWidth, setGridWidth] = useState(720);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setFavorites(new Set(readList(FAVORITES_KEY)));
    setRecentIds(readList(RECENT_KEY));
  }, []);

  useEffect(() => {
    const nextCommittedId = currentAvatar?.id ?? null;
    setCommittedId(nextCommittedId);
    setSelectedId(nextCommittedId);
  }, [currentAvatar?.id]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateWidth = () => setGridWidth(scroller.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrollTop(0);
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [activeTab, query]);

  const selectedAvatar = selectedId ? avatarMap.get(selectedId) ?? null : null;
  const selectedRarity = getAvatarRarityInfo(selectedAvatar?.rarity ?? "common");
  const selectedFrame = getAvatarFrame(selectedAvatar?.frameId ?? "none");
  const previewUrl = selectedAvatar?.url ?? currentAvatarUrl;
  const previewName = selectedAvatar?.name ?? currentAvatar?.name ?? "Current profile picture";
  const hasChanged = Boolean(selectedAvatar && selectedAvatar.url !== currentAvatarUrl);
  const saveDisabled = !hasChanged || saving;
  const favoriteAvatars = useMemo(
    () => Array.from(favorites).map((id) => avatarMap.get(id)).filter(Boolean) as AvatarOption[],
    [avatarMap, favorites]
  );
  const recentAvatars = useMemo(
    () => recentIds.map((id) => avatarMap.get(id)).filter(Boolean) as AvatarOption[],
    [avatarMap, recentIds]
  );

  const filteredAvatars = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = getTabSource(activeTab, favoriteAvatars, recentAvatars);
    if (!normalizedQuery) return source;

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    return source.filter((avatar) => terms.every((term) => avatar.searchText.includes(term)));
  }, [activeTab, favoriteAvatars, query, recentAvatars]);

  const columns = Math.max(3, Math.min(8, Math.floor((gridWidth + 12) / 118)));
  const totalRows = Math.ceil(filteredAvatars.length / columns);
  const gridHeight = filteredAvatars.length === 0 ? 180 : Math.min(GRID_MAX_HEIGHT, Math.max(GRID_ROW_HEIGHT, totalRows * GRID_ROW_HEIGHT));
  const visibleRowCount = Math.ceil(gridHeight / GRID_ROW_HEIGHT) + 3;
  const startRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_HEIGHT) - 1);
  const endRow = Math.min(totalRows, startRow + visibleRowCount);
  const visibleAvatars = filteredAvatars.slice(startRow * columns, endRow * columns);
  const accentColor = selectedAvatar?.accentColor ?? "#FF1E1E";
  const themeStyle = { "--avatar-accent": accentColor } as CSSProperties;

  function selectAvatar(id: string) {
    setSelectedId(id);
    setNotice(null);
    rememberRecent(id);
  }

  function rememberRecent(id: string) {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 18);
      writeList(RECENT_KEY, next);
      return next;
    });
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeList(FAVORITES_KEY, Array.from(next));
      return next;
    });
  }

  function pickRandomAvatar() {
    const avatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
    const identity = createRandomIdentity(Date.now() + avatar.id.length);
    setRandomIdentity({ ...identity, avatar, accentColor: avatar.accentColor });
    setActiveTab("all");
    setQuery("");
    selectAvatar(avatar.id);
  }

  async function handleSave() {
    if (!selectedAvatar || !hasChanged || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setNotice(null);
    const attemptedAvatar = selectedAvatar;
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ avatarId: selectedAvatar.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSelectedId(committedId);
        setNotice({ type: "error", message: data.error ?? "Could not update avatar. Your preview was rolled back." });
        return;
      }
      const savedUrl = typeof data.avatarUrl === "string" ? data.avatarUrl : attemptedAvatar.url;
      rememberRecent(attemptedAvatar.id);
      setCommittedId(attemptedAvatar.id);
      setNotice({ type: "success", message: "Profile picture saved." });
      onSelected(savedUrl, attemptedAvatar);
      closeTimerRef.current = window.setTimeout(onClose, 700);
    } catch {
      setSelectedId(committedId);
      setNotice({ type: "error", message: "Could not reach the server. Your preview was rolled back." });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md sm:px-6" style={themeStyle}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-library-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-y-auto rounded-2xl border border-white/12 bg-[#070707]/95 shadow-[0_24px_110px_rgba(0,0,0,0.8)] lg:overflow-hidden"
      >
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
          <div>
            <h2 id="avatar-library-title" className="font-display text-lg font-black sm:text-xl">
              Avatar Library
            </h2>
            <p className="text-xs font-medium text-white/35">{AVATAR_TOTAL} premium profile pictures</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:border-[var(--avatar-accent)] hover:text-white"
            aria-label="Close avatar library"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r lg:p-5">
            <div className="flex gap-4 lg:block">
              <div className="relative mx-auto h-28 w-28 shrink-0 sm:h-36 sm:w-36 lg:h-44 lg:w-44">
                <div
                  className={clsx(
                    "avatar-selected-pulse absolute inset-0 rounded-full border-2 border-[#F9C74F] shadow-[0_0_32px_rgba(249,199,79,0.38)]",
                    selectedFrame.className
                  )}
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={previewName}
                    className="relative h-full w-full rounded-full object-cover p-1"
                    decoding="async"
                  />
                ) : (
                  <div className="relative h-full w-full rounded-full bg-white/[0.04]" />
                )}
                {selectedAvatar && (
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#070707] bg-[#F9C74F] text-black shadow-[0_0_18px_rgba(249,199,79,0.65)]">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    className="absolute left-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#070707] bg-white text-black shadow-[0_0_18px_rgba(255,255,255,0.28)] transition hover:scale-105"
                    aria-label="Zoom profile picture preview"
                  >
                    <ZoomIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1 lg:mt-5">
                <p className="truncate font-display text-base font-black sm:text-lg">
                  {previewName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white/65">
                    {selectedAvatar?.categoryLabel ?? "Saved"}
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide"
                    style={{ borderColor: selectedRarity.color, color: selectedRarity.color }}
                  >
                    {selectedRarity.label}
                  </span>
                  {hasChanged ? (
                    <span className="rounded-full border border-[#F9C74F]/40 bg-[#F9C74F]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#F9C74F]">
                      Unsaved
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white/35">
                      Saved
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-white/35">Frame</p>
                    <p className="mt-0.5 truncate font-semibold">{selectedFrame.label}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-white/35">Accent</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: accentColor }} />
                      <span className="font-mono text-[11px]">{accentColor}</span>
                    </div>
                  </div>
                </div>

                <Button type="button" onClick={pickRandomAvatar} size="sm" className="mt-4 w-full gap-2">
                  <ShuffleIcon className="h-4 w-4" />
                  Random Avatar
                </Button>
                <Button type="button" onClick={handleSave} disabled={saveDisabled} size="sm" className="mt-2 w-full">
                  {saving ? "Saving..." : hasChanged ? "Save Profile Picture" : "Saved"}
                </Button>

                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/35">Random identity</p>
                  <div className="mt-2 flex items-center gap-2">
                    <img src={randomIdentity.avatar.url} alt="" className="h-8 w-8 rounded-full" loading="lazy" decoding="async" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold">{randomIdentity.username}</p>
                      <p className="font-mono text-[11px] text-white/35">{randomIdentity.accentColor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <QuickStrip title="Favorites" avatars={favoriteAvatars.slice(0, 8)} onSelect={selectAvatar} emptyLabel="No favorites yet" />
            <QuickStrip title="Recently Used" avatars={recentAvatars.slice(0, 8)} onSelect={selectAvatar} emptyLabel="No recent picks" />

            <div className="mt-4 hidden lg:block">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">Future badges</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATUS_BADGES.slice(0, 5).map((badge) => (
                  <span
                    key={badge.id}
                    className="rounded-full border px-2 py-1 text-[10px] font-bold text-white/70"
                    style={{ borderColor: `${badge.accentColor}66` }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-h-0 p-4 sm:p-5">
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className={clsx(
                  "mb-3 rounded-xl border px-4 py-3 text-sm font-semibold",
                  notice.type === "success"
                    ? "border-[#20E3B2]/35 bg-[#20E3B2]/10 text-[#9FFFE9]"
                    : "border-aura-purple/35 bg-aura-purple/10 text-aura-purple"
                )}
              >
                {notice.message}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/45 focus-within:border-[var(--avatar-accent)]">
                <SearchIcon className="h-4 w-4 shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search robot, anime, dark, wolf, cyber, mage, blue..."
                  className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-white/35">
                <span className="h-2 w-2 rounded-full" style={{ background: accentColor }} />
                <span>{filteredAvatars.length} visible</span>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Avatar categories">
              {browserTabs.map((tab) => {
                const active = activeTab === tab.id;
                const dynamicCount = tab.id === "favorites" ? favorites.size : tab.id === "recent" ? recentIds.length : tab.count;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition",
                      active
                        ? "border-[var(--avatar-accent)] bg-white/[0.08] text-white shadow-[0_0_22px_color-mix(in_srgb,var(--avatar-accent)_35%,transparent)]"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {tab.label}
                    <span className="ml-2 text-white/30">{dynamicCount}</span>
                  </button>
                );
              })}
            </nav>

            {filteredAvatars.length === 0 ? (
              <div className="mt-5 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-white/35">
                No avatars found
              </div>
            ) : (
              <div
                ref={scrollerRef}
                onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                className="mt-3 overflow-y-auto overflow-x-hidden pr-1"
                style={{ height: gridHeight }}
              >
                <div className="relative" style={{ height: totalRows * GRID_ROW_HEIGHT }}>
                  <div
                    className="absolute left-0 right-0 grid gap-3"
                    style={{
                      top: startRow * GRID_ROW_HEIGHT,
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    }}
                  >
                    {visibleAvatars.map((avatar) => (
                      <AvatarTile
                        key={avatar.id}
                        avatar={avatar}
                        selected={selectedAvatar?.id === avatar.id}
                        favorite={favorites.has(avatar.id)}
                        onSelect={selectAvatar}
                        onFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-[#070707]/95 pt-4 backdrop-blur">
              <div className="min-w-[220px] flex-1">
                <p className="text-xs font-semibold text-white/45">
                  {hasChanged
                    ? "Preview selected. Save it to update your profile everywhere."
                    : selectedAvatar
                      ? "Pick a different avatar to enable saving."
                      : "Choose an avatar to preview it before saving."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                {AVATAR_RARITIES.slice(0, 6).map((rarity) => (
                  <span key={rarity.id} className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
                    {rarity.label}
                  </span>
                ))}
                {AVATAR_FRAMES.slice(1, 5).map((frame) => (
                  <span key={frame.id} className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
                    {frame.label}
                  </span>
                ))}
                </div>
              </div>
              <div className="ml-auto flex gap-3">
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={saveDisabled} className="min-w-[184px]">
                  {saving ? "Saving..." : "Save Profile Picture"}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </section>
      {zoomOpen && previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[0.85] p-5 backdrop-blur-lg"
          role="dialog"
          aria-modal="true"
          aria-label="Profile picture zoom preview"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:border-white/25 hover:text-white"
            aria-label="Close zoom preview"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={previewUrl}
            alt={previewName}
            className="max-h-[82vh] max-w-[82vw] rounded-[2rem] border border-white/12 bg-black object-contain shadow-[0_32px_140px_rgba(0,0,0,0.86)]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function AvatarTile({
  avatar,
  selected,
  favorite,
  onSelect,
  onFavorite,
}: {
  avatar: AvatarOption;
  selected: boolean;
  favorite: boolean;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  const rarity = getAvatarRarityInfo(avatar.rarity);
  const tileStyle = { "--tile-accent": avatar.accentColor } as CSSProperties;

  return (
    <div
      className={clsx(
        "group relative h-[126px] rounded-xl border bg-white/[0.03] p-1.5 transition duration-200 hover:z-10 hover:border-[var(--tile-accent)] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--tile-accent)_34%,transparent)]",
        selected ? "border-[#F9C74F] shadow-[0_0_28px_rgba(249,199,79,0.32)]" : "border-white/8"
      )}
      style={tileStyle}
    >
      <button type="button" onClick={() => onSelect(avatar.id)} className="block h-full w-full text-left">
        <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-black transition duration-200 group-hover:scale-110">
          <img src={avatar.url} alt={avatar.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          {selected && (
            <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F9C74F] text-black">
              <CheckIcon className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="mt-1 min-w-0 px-1 text-center">
          <p className="truncate text-[11px] font-bold text-white/78">{avatar.name}</p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide" style={{ color: rarity.color }}>
            {rarity.label}
          </p>
        </div>
      </button>
      {avatar.isNew && (
        <span className="absolute left-2 top-2 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
          New
        </span>
      )}
      {avatar.isTrending && (
        <span className="absolute right-8 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--tile-accent)] bg-black/70 text-[var(--tile-accent)]">
          <StarIcon className="h-3 w-3" />
        </span>
      )}
      <button
        type="button"
        onClick={() => onFavorite(avatar.id)}
        className={clsx(
          "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-black/70 transition",
          favorite ? "border-[#F9C74F] text-[#F9C74F]" : "border-white/15 text-white/45 hover:text-white"
        )}
        aria-label={favorite ? `Remove ${avatar.name} from favorites` : `Favorite ${avatar.name}`}
      >
        <HeartIcon className="h-3 w-3" filled={favorite} />
      </button>
    </div>
  );
}

function QuickStrip({
  title,
  avatars,
  emptyLabel,
  onSelect,
}: {
  title: string;
  avatars: AvatarOption[];
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/30">{title}</p>
      {avatars.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              className="rounded-full border border-white/10 p-0.5 transition hover:border-[var(--avatar-accent)]"
              title={avatar.name}
            >
              <img src={avatar.url} alt={avatar.name} className="h-8 w-8 rounded-full" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/25">{emptyLabel}</p>
      )}
    </div>
  );
}

function getTabSource(activeTab: BrowserTab, favoriteAvatars: AvatarOption[], recentAvatars: AvatarOption[]) {
  if (activeTab === "favorites") return favoriteAvatars;
  if (activeTab === "recent") return recentAvatars;
  if (activeTab === "trending") return AVATAR_OPTIONS.filter((avatar) => avatar.isTrending);
  if (activeTab === "new") return AVATAR_OPTIONS.filter((avatar) => avatar.isNew);
  if (activeTab === "all") return AVATAR_OPTIONS;
  return AVATAR_OPTIONS.filter((avatar) => avatar.categoryId === activeTab);
}

function readList(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function ShuffleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ZoomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m12 2 2.8 6 6.5.8-4.8 4.5 1.3 6.4L12 16.5l-5.8 3.2 1.3-6.4-4.8-4.5 6.5-.8L12 2Z" />
    </svg>
  );
}

function HeartIcon({ filled, ...props }: React.SVGProps<SVGSVGElement> & { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z" />
    </svg>
  );
}
