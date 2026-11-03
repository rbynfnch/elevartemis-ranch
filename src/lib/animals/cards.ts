import type { Database } from "@/lib/database.types";
import type { Species } from "@/lib/domain/species";
import { speciesTerms } from "@/lib/domain/species";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { formatMoney } from "@/lib/animals/breeding";
import type { AnimalCardData } from "@/components/animals/animal-card";

type CardRow = Database["public"]["Views"]["public_animal_cards"]["Row"];

/** A card plus what the listing pages need to group and order it. */
export type ListingCard = AnimalCardData & {
  species: Species;
  categoryId: string | null;
  groupsByBirthYear: boolean;
  displayOrder: number;
};

/** The price line for a for-sale card, as the owner chose to show it. Null when there is nothing to say. */
export function priceLine(
  row: Pick<CardRow, "sale_status" | "price_mode" | "price_cents" | "currency">,
): string | null {
  if (row.sale_status !== "available" && row.sale_status !== "pending") return null;
  if (row.price_mode === "price" && row.price_cents != null) return formatMoney(row.price_cents, row.currency ?? "USD");
  if (row.price_mode === "contact") return "Contact for price";
  return null;
}

export function cardFromRow(a: CardRow): ListingCard {
  const variant = pickVariant(a.photo_variants, 960);
  const species = a.species as Species;
  return {
    name: a.name!,
    href: `/${speciesTerms[species].path}/${a.slug}`,
    categoryLabel: a.category_label!,
    breed: a.breed,
    birthYear: a.birth_year,
    badge:
      a.sale_status === "available"
        ? "For Sale"
        : a.sale_status === "pending"
          ? "Sale Pending"
          : a.sale_status === "sold"
            ? "Sold"
            : null,
    price: priceLine(a),
    photo: variant
      ? {
          src: mediaUrl(variant.path),
          alt: a.photo_alt ?? a.name!,
          focalX: Number(a.photo_focal_x ?? 0.5),
          focalY: Number(a.photo_focal_y ?? 0.5),
        }
      : null,
    species,
    categoryId: a.category_id,
    groupsByBirthYear: Boolean(a.groups_by_birth_year),
    displayOrder: a.display_order ?? 0,
  };
}
