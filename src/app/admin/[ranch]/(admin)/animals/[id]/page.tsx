import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { animalNeighbors, getAnimal } from "@/lib/admin/animals/service";
import { AnimalStepper } from "@/components/admin/animals/animal-stepper";
import { keepCategoryAction } from "@/lib/admin/animals/actions";
import { loadBreeds, loadFactLabels, loadRanchCategories } from "@/lib/admin/animals/categories";
import { isAtLeastYearsOld } from "@/lib/admin/dashboard";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { speciesTerms } from "@/lib/domain/species";
import { BasicsFields } from "@/components/admin/animals/basics-form";
import { ProfileFields } from "@/components/admin/animals/profile-fields";
import { AnimalEditForm } from "@/components/admin/animals/edit-form";
import { StatusForm } from "@/components/admin/animals/status-form";
import { SaleForm } from "@/components/admin/animals/sale-form";
import { BreedingForm } from "@/components/admin/animals/breeding-form";
import { PerformanceForm } from "@/components/admin/animals/performance-form";
import { DetailsEditor } from "@/components/admin/animals/details-editor";
import { PhotoManager } from "@/components/admin/animals/photo-manager";
import { PedigreeBuilder } from "@/components/admin/pedigree/pedigree-builder";
import { loadPedigree } from "@/lib/admin/pedigree/service";
import { MoveToDeletedButton } from "@/components/admin/animals/archive-controls";
import { FormMessage, Panel } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit animal" };

const growth: Record<string, { years: number; next: string; keep: string }> = {
  "horse.foal": { years: 1, next: "Young Horse", keep: "Keep as Foal" },
  "cattle.calf": { years: 1, next: "Yearling", keep: "Keep as Calf" },
  "cattle.yearling": { years: 2, next: "Bull or Cow", keep: "Keep as Yearling" },
};

export default function EditAnimalPage({ params, searchParams }: PageProps<"/admin/[ranch]/animals/[id]">) {
  return (
    <Suspense fallback={null}>
      <EditAnimal params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditAnimal({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]/animals/[id]">["params"];
  searchParams: PageProps<"/admin/[ranch]/animals/[id]">["searchParams"];
}) {
  const { ranch, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await requireAdmin(ranch);
  if (!ctx) return null;
  const q = await searchParams;
  const db = await createServerSupabase();
  const [result, categories, breeds] = await Promise.all([
    getAnimal(db, ctx.ranch.id, id),
    loadRanchCategories(db, ctx.ranch.id),
    loadBreeds(db, ctx.ranch.id),
  ]);
  // Previous / Next follow the Animals list the owner came from (its species, filter and search).
  const from = typeof q.from === "string" ? q.from : "";
  const fromParams = new URLSearchParams(from);
  const fromSpecies = fromParams.get("species");
  const neighbors = result.ok
    ? await animalNeighbors(db, ctx.ranch.id, id, {
        species: fromSpecies === "horse" || fromSpecies === "cattle" ? fromSpecies : undefined,
        show: fromParams.get("show") ?? undefined,
        q: fromParams.get("q") ?? undefined,
      })
    : null;
  const stepHref = (animalId: string | undefined) =>
    animalId ? `/admin/animals/${animalId}${from ? `?from=${encodeURIComponent(from)}` : ""}` : null;
  const pedigreeNodes = result.ok ? await loadPedigree(db, id) : null;
  const factLabels = result.ok ? await loadFactLabels(db, ctx.ranch.id, result.data.animal.species) : [];
  if (!result.ok) notFound();
  const { animal, sale, breeding, performance, facts, sections, photos, videoUrl } = result.data;
  if (animal.record_scope !== "inventory") notFound();

  const suggestion = animal.category_id ? growth[animal.category_id] : undefined;
  const showGrowth =
    suggestion &&
    !animal.category_confirmed_at &&
    isAtLeastYearsOld(animal.birth_date, new Date().toISOString().slice(0, 10), suggestion.years);
  const publicHref = `/${speciesTerms[animal.species].path}/${animal.slug}`;

  const sectionsNav = [
    ["photos", "Photos"],
    ["basics", "Basics"],
    ["headline", "Headline"],
    ["website", "On the website"],
    ["for-sale", "For Sale"],
    ...(animal.sex === "male" ? [["breeding", "Breeding"]] : []),
    ...(animal.species === "cattle" ? [["performance", "Performance"]] : []),
    ["details", "Facts and stories"],
    ["pedigree", "Pedigree"],
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <Link
            href={`/admin/animals${from ? `?${from}` : ""}`}
            className="text-primary underline decoration-accent underline-offset-4"
          >
            Animals
          </Link>
        </p>
        {neighbors && neighbors.total > 1 ? (
          <AnimalStepper
            neighbors={neighbors}
            prevHref={stepHref(neighbors.prev?.id)}
            nextHref={stepHref(neighbors.next?.id)}
          />
        ) : null}
      </div>
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl">{animal.name}</h1>
          {animal.is_published ? (
            <a href={publicHref} target="_blank" rel="noopener" className={buttonClasses("secondary")}>
              View on website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="text-sm text-ink-muted">Hidden from the website</span>
          )}
        </div>
        {animal.is_demo ? (
          <FormMessage tone="info">This is sample content. Replace it with a real animal before launch.</FormMessage>
        ) : null}
        {q.added === "1" ? (
          <FormMessage tone="success">
            {animal.name} was added and is on your website. Add photos next.{" "}
            {animal.is_published ? (
              <a
                href={publicHref}
                target="_blank"
                rel="noopener"
                className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
              >
                View {animal.name} on the website<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </FormMessage>
        ) : null}
        {q.kept === "1" ? (
          <FormMessage tone="success">Got it. We won&apos;t suggest moving {animal.name} again.</FormMessage>
        ) : null}
        {showGrowth ? (
          <div className="flex flex-wrap items-center gap-3 border-l-2 border-accent bg-accent/10 px-4 py-3">
            <p className="flex-1">
              {animal.name} is over {suggestion.years === 1 ? "a year" : `${suggestion.years} years`} old. Move to{" "}
              {suggestion.next}? Change the category under Basics, or:
            </p>
            <form action={keepCategoryAction}>
              <input type="hidden" name="id" value={animal.id} />
              <button className={buttonClasses("secondary", "py-2")}>{suggestion.keep}</button>
            </form>
          </div>
        ) : null}
        <p className="max-w-[62ch] text-sm text-ink-muted">
          Photos save as you add them. Everything below is saved together with the one Save button at the bottom.
        </p>
        <nav aria-label="Sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {sectionsNav.map(([anchor, label]) => (
            <a
              key={anchor}
              href={`#${anchor}`}
              className="min-h-11 content-center text-primary underline decoration-rule underline-offset-4 hover:decoration-accent"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Panel id="photos" title="Photos">
        <PhotoManager
          animalId={animal.id}
          animalName={animal.name}
          photos={photos.map((p) => {
            const thumb = pickVariant(p.variants, 480);
            const large = pickVariant(p.variants, 1280);
            return {
              id: p.id,
              isPrimary: p.isPrimary,
              thumb: thumb ? mediaUrl(thumb.path) : null,
              large: large ? mediaUrl(large.path) : null,
              focalX: Number(p.focal_x),
              focalY: Number(p.focal_y),
              alt: p.alt_text,
              status: p.status,
            };
          })}
        />
      </Panel>

      <AnimalEditForm animalId={animal.id}>
        <Panel id="basics" title="Basics">
          <BasicsFields
            animal={animal}
            categories={categories.filter((c) => c.species === animal.species)}
            enabledSpecies={[animal.species]}
            breeds={breeds}
          />
        </Panel>

        <Panel
          id="headline"
          title="Headline and highlights"
          description="What the top of this animal's page says besides its name. All optional."
        >
          <ProfileFields
            // Both are empty (not missing) until the database update that adds them has been applied.
            tagline={animal.tagline ?? null}
            highlights={animal.highlights ?? []}
            videoUrl={videoUrl}
          />
        </Panel>

        <Panel id="website" title="On the website">
          <StatusForm animal={animal} />
        </Panel>

        <Panel id="for-sale" title="For Sale">
          <SaleForm sale={sale} />
        </Panel>

        {animal.sex === "male" ? (
          <Panel
            id="breeding"
            title="Breeding Services"
            description="Optional. Only the details you fill in appear on his page."
          >
            <BreedingForm species={animal.species} available={animal.breeding_available} row={breeding} />
          </Panel>
        ) : null}

        {animal.species === "cattle" ? (
          <Panel
            id="performance"
            title="Performance"
            description="Weights and EPDs buyers compare. Everything is optional; only what you fill in is shown."
          >
            <PerformanceForm performance={performance} />
          </Panel>
        ) : null}

        <Panel id="details" title="Facts and stories">
          <DetailsEditor labelSuggestions={factLabels} facts={facts} sections={sections} />
        </Panel>
      </AnimalEditForm>

      <Panel
        id="pedigree"
        title="Parents and pedigree"
        description="Choose this animal's sire and dam, and their parents, back three generations. Horses you own link to their own pages; others show as plain text."
      >
        <PedigreeBuilder
          animalId={animal.id}
          animalName={animal.name}
          species={animal.species}
          nodes={pedigreeNodes?.ok ? pedigreeNodes.data : []}
        />
      </Panel>

      <section className="border-t border-rule pt-10">
        <h2 className="font-display text-2xl">Delete</h2>
        <p className="mt-2 max-w-[62ch] text-ink-muted">
          Deleted animals go to Recently Deleted, where you can restore them. Pedigrees that include {animal.name} are
          kept.
        </p>
        <div className="mt-4">
          <MoveToDeletedButton id={animal.id} name={animal.name} />
        </div>
      </section>
    </div>
  );
}
