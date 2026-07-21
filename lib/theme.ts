export const THEME_STORAGE_KEY = "paradeone-theme";

export const THEME_OPTIONS = [
  {
    id: "daylight",
    label: "Bright Daylight",
    description: "Bright layered surfaces with dark, high-contrast text",
  },
  {
    id: "light",
    label: "Lighter Slate",
    description: "Brighter slate with clearly separated panels",
  },
  {
    id: "dark",
    label: "Midnight Dark",
    description: "Low-glare console with distinct surface levels",
  },
  {
    id: "ocean",
    label: "Ocean Blue",
    description: "High-contrast navy and blue-gray tones",
  },
  {
    id: "forest",
    label: "Forest Green",
    description: "High-contrast evergreen interface tones",
  },
  {
    id: "crimson",
    label: "Crimson",
    description: "High-contrast warm burgundy tones",
  },
] as const;

export type ParadeOneTheme = (typeof THEME_OPTIONS)[number]["id"];

export const DEFAULT_THEME: ParadeOneTheme = "light";

export function isParadeOneTheme(value: string | null | undefined): value is ParadeOneTheme {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}
