"use client";

import { useFieldErrors } from "@/components/admin/animals/edit-form";
import { Field, TextInput } from "@/components/admin/forms";
import { HIGHLIGHTS, HIGHLIGHT_MAX, TAGLINE_MAX } from "@/lib/admin/animals/limits";

/**
 * What the top of the animal's public page says besides its name: a one-line
 * tagline, up to four short highlights (shown with one small icon each), and a
 * link to a video. All optional; whatever is left empty simply doesn't appear.
 */
export function ProfileFields({
  tagline,
  highlights,
  videoUrl,
}: {
  tagline: string | null;
  highlights: string[];
  videoUrl: string | null;
}) {
  const err = useFieldErrors();
  return (
    <div className="max-w-2xl space-y-6">
      <Field
        id="tagline"
        label="Tagline"
        hint="One line under the name. For example: A proven ranch gelding with the mind and durability we value."
        error={err.tagline}
      >
        <TextInput
          id="tagline"
          name="tagline"
          defaultValue={tagline ?? ""}
          maxLength={TAGLINE_MAX}
          autoComplete="off"
          hasHint
          invalid={!!err.tagline}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Highlights</legend>
        <p className="text-sm text-ink-muted">
          Up to {HIGHLIGHTS} short phrases, like &ldquo;Ranch Proven&rdquo; or &ldquo;Trail Ready&rdquo;.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: HIGHLIGHTS }, (_, i) => (
            <div key={i}>
              <label htmlFor={`highlight-${i}`} className="sr-only">
                Highlight {i + 1}
              </label>
              <TextInput
                id={`highlight-${i}`}
                name="highlight"
                defaultValue={highlights[i] ?? ""}
                maxLength={HIGHLIGHT_MAX}
                autoComplete="off"
                placeholder={["Ranch Proven", "Trail Ready", "Quiet Minded", "Good Foot & Bone"][i]}
                invalid={!!err.highlights}
              />
            </div>
          ))}
        </div>
        {err.highlights ? <p className="text-sm font-semibold text-[#8a2b1d]">{err.highlights}</p> : null}
      </fieldset>

      <Field
        id="video_url"
        label="Video link"
        hint="A link to a video on YouTube, Vimeo, TikTok, Instagram or Facebook. It adds a Watch Video button that opens in a new tab."
        error={err.video_url}
      >
        <TextInput
          id="video_url"
          name="video_url"
          type="url"
          defaultValue={videoUrl ?? ""}
          placeholder="https://"
          hasHint
          invalid={!!err.video_url}
        />
      </Field>
    </div>
  );
}
