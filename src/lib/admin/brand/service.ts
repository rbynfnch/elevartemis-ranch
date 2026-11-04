import "server-only";
/**
 * The ranch's look: name as shown, mark, colors and fonts. Owners choose from ready-made looks (never raw colors), and
 * because branding is not writable by owners directly, saving uses the service client after the action has
 * checked that the person is this ranch's owner.
 */
import type { Db, Result } from "@/lib/admin/animals/service";
import { dbErrorMessage } from "@/lib/auth/messages";
import { createServiceSupabase } from "@/lib/supabase/service";
import { presetById, presetForOverride } from "@/lib/brand/presets";
import { fontPresets, parsePaletteOverride, resolveFontPreset, type FontPreset } from "@/lib/brand/tokens";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type BrandForm = { wordmark: string; subtitle: string; mark: string; presetId: string | null; font: FontPreset };
export type BrandInput = { wordmark: string; subtitle: string; mark: string; presetId: string; font: string };

export async function loadBrand(db: Db, ranchId: string, ranchName: string): Promise<Result<BrandForm>> {
  const { data, error } = await db
    .from("ranch_branding")
    .select("wordmark_text, wordmark_subtitle, brand_mark, palette, font_preset")
    .eq("ranch_id", ranchId)
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  return ok({
    wordmark: data?.wordmark_text?.trim() || ranchName,
    subtitle: data?.wordmark_subtitle ?? "",
    mark: data?.brand_mark ?? "",
    presetId: presetForOverride(parsePaletteOverride(data?.palette))?.id ?? null,
    font: resolveFontPreset(data?.font_preset),
  });
}

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

export async function saveBrand(
  ranchId: string,
  ranchName: string,
  input: BrandInput,
  isOwner: boolean,
): Promise<Result> {
  if (!isOwner) return fail("Only the ranch's owner can change the look of the site.");
  const preset = presetById(input.presetId);
  if (!preset) return fail("Choose one of the looks.");
  if (!(input.font in fontPresets)) return fail("Choose one of the fonts.");
  const wordmark = squash(input.wordmark, 60);
  const mark = squash(input.mark, 4);
  const { error } = await createServiceSupabase()
    .from("ranch_branding")
    .update({
      // The ranch's own name is the default; only a different wordmark is stored.
      wordmark_text: wordmark && wordmark !== ranchName ? wordmark : null,
      wordmark_subtitle: squash(input.subtitle, 60) || null,
      brand_mark: mark || null,
      palette: preset.override as never,
      font_preset: input.font,
    })
    .eq("ranch_id", ranchId);
  return error ? fail(dbErrorMessage(error)) : ok(null);
}
