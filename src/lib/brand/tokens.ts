import type { CSSProperties } from "react";
import { z } from "zod";

/**
 * Temporary Elevartemis ranch identity ("High Plains").
 *
 * Every ranch starts from these defaults. Elevartemis may override any colour
 * per ranch through ranch_branding.palette (e.g. {"primary": "#3B4F2E"}); the
 * owner never edits these. Tokens are applied as CSS custom properties on the
 * site wrapper, so replacing the brand never touches component code.
 */
export const paletteKeys = [
  "paper", // page background: pale sage-limestone
  "surface", // raised panels, image placeholders
  "ink", // body text: juniper-dark
  "inkMuted", // secondary text
  "primary", // buttons, links: juniper green
  "onPrimary", // text on primary
  "accent", // brass, like saddle hardware: rules, marks, small details
  "rule", // hairlines and borders: dry grass
  "night", // footer / dark bands
  "onNight", // text on night
] as const;

export type PaletteKey = (typeof paletteKeys)[number];
export type Palette = Record<PaletteKey, string>;

export const defaultPalette: Palette = {
  paper: "#F2F3EE",
  surface: "#E6E7DF",
  ink: "#232A25",
  inkMuted: "#555C56",
  primary: "#2F4A3C",
  onPrimary: "#F4F5F0",
  accent: "#9A7536",
  rule: "#D2D3C5",
  night: "#1E2A23",
  onNight: "#E6E8E1",
};

const cssVarName: Record<PaletteKey, string> = {
  paper: "--c-paper",
  surface: "--c-surface",
  ink: "--c-ink",
  inkMuted: "--c-ink-muted",
  primary: "--c-primary",
  onPrimary: "--c-on-primary",
  accent: "--c-accent",
  rule: "--c-rule",
  night: "--c-night",
  onNight: "--c-on-night",
};

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const paletteOverrideSchema = z.partialRecord(z.enum(paletteKeys), hex);

/**
 * Parses a stored palette override, silently dropping invalid entries so a
 * typo in branding can never break a live site.
 */
export function parsePaletteOverride(raw: unknown): Partial<Palette> {
  if (!raw || typeof raw !== "object") return {};
  const clean: Partial<Palette> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = paletteOverrideSchema.safeParse({ [key]: value });
    if (parsed.success) Object.assign(clean, parsed.data);
  }
  return clean;
}

/** Defaults + override. If primary changes but onPrimary doesn't, pick a readable one. */
export function resolvePalette(override: Partial<Palette>): Palette {
  const palette = { ...defaultPalette, ...override };
  if (override.primary && !override.onPrimary) {
    palette.onPrimary = readableOn(palette.primary, [defaultPalette.onPrimary, palette.ink]);
  }
  if (override.night && !override.onNight) {
    palette.onNight = readableOn(palette.night, [defaultPalette.onNight, palette.ink]);
  }
  return palette;
}

/** Inline style that applies a palette to a subtree. Only non-default values are emitted. */
export function paletteStyle(palette: Palette): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of paletteKeys) {
    if (palette[key].toLowerCase() !== defaultPalette[key].toLowerCase()) {
      style[cssVarName[key]] = palette[key];
    }
  }
  return style as CSSProperties;
}

// ─── Font presets ────────────────────────────────────────────────────────────
// Fonts are self-hosted (Fontsource) and declared in globals.css per preset.
// Adding a preset = one CSS block + one entry here.
export const fontPresets = {
  heritage: { label: "Heritage — Libre Caslon + Libre Franklin" },
  prairie: { label: "Prairie — Bitter + Source Sans 3" },
} as const;
export type FontPreset = keyof typeof fontPresets;

export function resolveFontPreset(raw: string | null | undefined): FontPreset {
  return raw && raw in fontPresets ? (raw as FontPreset) : "heritage";
}

// ─── Contrast (WCAG 2.x) ─────────────────────────────────────────────────────
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hexColor: string): number {
  const n = Number.parseInt(hexColor.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function readableOn(background: string, candidates: string[]): string {
  return candidates.reduce((best, c) => (contrastRatio(background, c) > contrastRatio(background, best) ? c : best));
}

/** Pairs that must meet WCAG AA for normal text (4.5:1). */
export const requiredContrastPairs: ReadonlyArray<[PaletteKey, PaletteKey]> = [
  ["ink", "paper"],
  ["inkMuted", "paper"],
  ["primary", "paper"],
  ["onPrimary", "primary"],
  ["onNight", "night"],
  ["ink", "surface"],
];

export function contrastProblems(palette: Palette): string[] {
  return requiredContrastPairs
    .map(([fg, bg]) => ({ fg, bg, ratio: contrastRatio(palette[fg], palette[bg]) }))
    .filter((p) => p.ratio < 4.5)
    .map((p) => `${p.fg} on ${p.bg}: ${p.ratio.toFixed(2)}:1 (needs 4.5:1)`);
}
