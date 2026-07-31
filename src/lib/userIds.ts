export const PUBLIC_USER_ID_LENGTH = 10;
export const PUBLIC_USER_ID_PATTERN = /^\d{10}$/;
export const PUBLIC_USER_MENTION_PATTERN = /@(\d{10})\b/g;

export function formatPublicUserId(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\D/g, "").padStart(PUBLIC_USER_ID_LENGTH, "0").slice(-PUBLIC_USER_ID_LENGTH);
}

export function isPublicUserId(value: string): boolean {
  return PUBLIC_USER_ID_PATTERN.test(value.trim());
}

export function normalizePublicUserId(value: string): string | null {
  const cleaned = value.trim().replace(/^@/, "");
  return isPublicUserId(cleaned) ? cleaned : null;
}

export function publicProfileHref(username: string, userId?: unknown): string {
  const id = formatPublicUserId(userId);
  return `/profile/${id || encodeURIComponent(username)}`;
}
