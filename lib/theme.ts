export const THEME_STORAGE_KEY = "paradeone-theme";

export const THEME_OPTIONS = [
  {
    id: "daylight",
    label: "Bright Daylight",
    description: "White surfaces with dark, high-contrast text",
  },
  {
    id: "light",
    label: "Lighter Slate",
    description: "Brighter surfaces for daytime use",
  },
  {
    id: "dark",
    label: "Midnight Dark",
    description: "Low-glare operations console",
  },
  {
    id: "ocean",
    label: "Ocean Blue",
    description: "Cool navy and blue-gray tones",
  },
  {
    id: "forest",
    label: "Forest Green",
    description: "Deep evergreen interface tones",
  },
  {
    id: "crimson",
    label: "Crimson",
    description: "Warm burgundy interface tones",
  },
] as const;

export type ParadeOneTheme = (typeof THEME_OPTIONS)[number]["id"];

export const DEFAULT_THEME: ParadeOneTheme = "light";

export function isParadeOneTheme(value: string | null | undefined): value is ParadeOneTheme {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}
