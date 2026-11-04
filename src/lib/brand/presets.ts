import { defaultPalette, resolvePalette, type Palette } from "./tokens";

/**
 * Ready-made looks an owner can choose from. Each is a full set of colors that meets the contrast rules
 * (a test checks this), so no choice can make text hard to read. "High Plains" is the platform default.
 */
export type PalettePreset = { id: string; label: string; mood: string; override: Partial<Palette> };

export const palettePresets: PalettePreset[] = [
  { id: "high-plains", label: "High Plains", mood: "Juniper green and brass. Calm and traditional.", override: {} },
  {
    id: "big-sky",
    label: "Big Sky",
    mood: "Deep blue and brass. Open and clear.",
    override: {
      paper: "#F3F5F5",
      surface: "#E4E9EA",
      ink: "#1F272D",
      inkMuted: "#4F5A62",
      primary: "#26485F",
      accent: "#A9782A",
      rule: "#CFD7DA",
      night: "#1A2A35",
      onNight: "#E4EAEE",
    },
  },
  {
    id: "prairie-gold",
    label: "Prairie Gold",
    mood: "Warm wheat and saddle brown. Friendly and earthy.",
    override: {
      paper: "#F6F2E7",
      surface: "#EAE3D2",
      ink: "#2A241A",
      inkMuted: "#5A5242",
      primary: "#6B4C1C",
      accent: "#A6562B",
      rule: "#D9D0B9",
      night: "#2B2418",
      onNight: "#EFE8D8",
    },
  },
  {
    id: "red-rock",
    label: "Red Rock",
    mood: "Rust and sandstone. Bold and rugged.",
    override: {
      paper: "#F6F1EB",
      surface: "#EBE2D8",
      ink: "#2B2220",
      inkMuted: "#5C504B",
      primary: "#7B2D1E",
      accent: "#A8772D",
      rule: "#DACDBF",
      night: "#2A1B17",
      onNight: "#EDE3DA",
    },
  },
  {
    id: "sagebrush",
    label: "Sagebrush",
    mood: "Soft sage and sand. Quiet and natural.",
    override: {
      paper: "#F4F5F0",
      surface: "#E7E9E0",
      ink: "#242B26",
      inkMuted: "#555D56",
      primary: "#46664F",
      accent: "#A88346",
      rule: "#D5D9CB",
      night: "#212B24",
      onNight: "#E7EAE2",
    },
  },
  {
    id: "copper-creek",
    label: "Copper Creek",
    mood: "Cool slate with a copper glint. Modern and sturdy.",
    override: {
      paper: "#F5F4F2",
      surface: "#E8E6E2",
      ink: "#22282D",
      inkMuted: "#535A60",
      primary: "#3C4E5C",
      accent: "#B0652F",
      rule: "#D8D5CF",
      night: "#1F272D",
      onNight: "#E8E9EA",
    },
  },
  {
    id: "mountain-lake",
    label: "Mountain Lake",
    mood: "Deep teal and brass. Fresh and clear.",
    override: {
      paper: "#F2F5F3",
      surface: "#E3EAE6",
      ink: "#1D2A28",
      inkMuted: "#4C5C58",
      primary: "#1F5C58",
      accent: "#AE843A",
      rule: "#CDD9D4",
      night: "#14302E",
      onNight: "#E2EBE8",
    },
  },
  {
    id: "wild-plum",
    label: "Wild Plum",
    mood: "Dusky plum and gold. Warm and distinctive.",
    override: {
      paper: "#F7F3F5",
      surface: "#ECE4E9",
      ink: "#2A2028",
      inkMuted: "#5F5059",
      primary: "#5A3A5E",
      accent: "#B38A3B",
      rule: "#DDD1D8",
      night: "#2A1F2B",
      onNight: "#EEE5EC",
    },
  },
];

export const presetById = (id: string | null | undefined) => palettePresets.find((p) => p.id === id) ?? null;

/** Which preset a stored palette matches, or null when it is a custom one set by us. */
export function presetForOverride(stored: Partial<Palette>): PalettePreset | null {
  const keys = Object.keys(stored) as (keyof Palette)[];
  if (keys.length === 0) return palettePresets[0];
  return (
    palettePresets.find((p) => {
      const o = p.override;
      const ok = Object.keys(o) as (keyof Palette)[];
      return ok.length === keys.length && ok.every((k) => o[k]?.toLowerCase() === stored[k]?.toLowerCase());
    }) ?? null
  );
}

export const fullPalette = (preset: PalettePreset): Palette =>
  resolvePalette({ ...defaultPalette, ...preset.override });
