import { getListing } from "@/lib/animals/listings";
import { getHeroSlides } from "@/lib/site/get-home";
import type { SiteSettings } from "@/lib/site/get-site";
import { speciesTerms, type Species } from "@/lib/domain/species";
import { ForSaleBrowser } from "./for-sale-browser";
import { ForSaleHero } from "./for-sale-hero";
import { EmptyListing } from "./listing";

/**
 * The For Sale page, whether reached as /for-sale or /horses/for-sale. Every
 * species the ranch sells gets a tab; the address picks which one opens first.
 */
export async function ForSalePageView({ site, initialSpecies }: { site: SiteSettings; initialSpecies?: Species }) {
  const [animals, slides] = await Promise.all([
    getListing(site.ranchId, site.slug, { kind: "for_sale" }),
    getHeroSlides(site.ranchId, site.slug, site.categories),
  ]);
  // Only species the ranch has turned for-sale pages on for, and only those with something listed.
  const species = site.enabledSpecies.filter(
    (s) => site.speciesSettings?.[s]?.showForSale !== false && animals.some((a) => a.species === s),
  );
  const names = species.map((s) => speciesTerms[s].plural);
  const title = names.length ? `${names.join(" & ")} from ${site.name}` : `For Sale at ${site.name}`;
  const photo = slides.find((s) => s.photo)?.photo ?? null;

  return (
    <>
      <ForSaleHero title={title} tagline={site.profile.tagline} photo={photo} />
      {species.length === 0 ? (
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-12">
          <EmptyListing />
        </div>
      ) : (
        <ForSaleBrowser
          animals={animals.filter((a) => species.includes(a.species))}
          species={species}
          initialSpecies={initialSpecies && species.includes(initialSpecies) ? initialSpecies : species[0]}
          brandMark={site.brand.mark}
        />
      )}
    </>
  );
}
