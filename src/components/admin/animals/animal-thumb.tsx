import { mediaUrl, pickVariant } from "@/lib/media/variants";
import type { Json } from "@/lib/database.types";

export function AnimalThumb({
  thumb,
  className,
}: {
  thumb: { variants: Json; focalX: number; focalY: number } | null;
  className?: string;
}) {
  const v = thumb ? pickVariant(thumb.variants, 320) : null;
  return (
    <div className={`overflow-hidden bg-surface ${className ?? ""}`}>
      {v ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(v.path)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          style={{ objectPosition: `${thumb!.focalX * 100}% ${thumb!.focalY * 100}%` }}
        />
      ) : null}
    </div>
  );
}
