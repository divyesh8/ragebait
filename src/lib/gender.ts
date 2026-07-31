export const GENDER_VALUES = ["Male", "Female", "Other"] as const;

export type Gender = (typeof GENDER_VALUES)[number];

export const GENDER_OPTIONS: { value: Gender; label: Gender }[] = GENDER_VALUES.map((value) => ({
  value,
  label: value,
}));

export function isGender(value: unknown): value is Gender {
  return typeof value === "string" && (GENDER_VALUES as readonly string[]).includes(value);
}

export function normalizeGender(value: unknown): Gender | null {
  return isGender(value) ? value : null;
}
