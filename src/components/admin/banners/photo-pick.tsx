"use client";

import { buttonClasses } from "@/components/ui/button";
import { PhotoChooser } from "./photo-chooser";

export type PickedPhoto = { id: string | null; thumb: string | null };

export function PhotoPick({
  label,
  photo,
  onChange,
}: {
  label: string;
  photo: PickedPhoto;
  onChange: (p: PickedPhoto) => void;
}) {
  return (
    <PhotoChooser
      label={photo.id ? "Change photo" : "Choose photo"}
      onChoose={(p) => onChange({ id: p.id, thumb: p.thumb })}
      trigger={(open) => (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{label}</p>
          {/* The picture itself is the button: click it to choose or change the photo. */}
          <button
            type="button"
            onClick={open}
            aria-label={photo.id ? `Change ${label.toLowerCase()}` : `Choose a ${label.toLowerCase()}`}
            className="group block text-left focus-visible:outline-2 focus-visible:outline-primary"
          >
            {photo.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.thumb} alt="" className="aspect-[4/3] w-48 border border-rule object-cover" />
            ) : (
              <span className="flex aspect-[4/3] w-48 items-center justify-center border border-dashed border-rule bg-surface px-3 text-center text-sm text-ink-muted group-hover:border-primary group-hover:text-ink">
                {photo.id ? "Photo chosen" : "No photo yet. Click to choose."}
              </span>
            )}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClasses("secondary", "py-2")} onClick={open}>
              {photo.id ? "Change photo" : "Choose photo"}
            </button>
            {photo.id ? (
              <button
                type="button"
                className={buttonClasses("quiet", "py-2")}
                onClick={() => onChange({ id: null, thumb: null })}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}
