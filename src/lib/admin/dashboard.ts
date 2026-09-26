/**
 * Dashboard "needs attention" rules as a pure function (easy to test and to
 * extend). Inputs are rows the owner can already read through RLS.
 */
export type DashAnimal = {
  id: string;
  name: string;
  species: "horse" | "cattle";
  category_id: string | null;
  record_scope: "inventory" | "pedigree_only";
  is_published: boolean;
  primary_media_id: string | null;
  birth_date: string | null;
  birth_precision: "year" | "month" | "day";
  archived_at: string | null;
  is_demo: boolean;
  /** Owner chose to keep this animal in its category; suppresses the suggestion. */
  category_confirmed_at?: string | null;
};
export type DashSale = { animal_id: string; status: "available" | "pending" | "sold" };
export type DashSlide = {
  id: string;
  headline: string;
  media_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  cta_kind: string;
  cta_animal_id: string | null;
  is_demo: boolean;
};
export type DashPost = { status: "draft" | "published"; archived_at: string | null; is_demo: boolean };

export type AttentionItem = { id: string; message: string; href: string; tone: "action" | "info" };
export type DashboardSummary = {
  stats: { label: string; value: number; href: string }[];
  attention: AttentionItem[];
};

/** Suggested next category once an animal reaches an age. Always a suggestion: the ranch decides. */
const growthSuggestions: Record<string, { years: number; next: string }> = {
  "horse.foal": { years: 1, next: "Young Horses" },
  "cattle.calf": { years: 1, next: "Yearlings" },
  "cattle.yearling": { years: 2, next: "Bulls or Cows" },
};

function listNames(names: string[], max = 3): string {
  if (names.length <= max) {
    return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  }
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

/** True when the animal is at least `years` old on `today` (ISO dates). */
export function isAtLeastYearsOld(birthDate: string | null, today: string, years: number): boolean {
  if (!birthDate) return false;
  const [y, m, d] = today.split("-").map(Number);
  const cutoff = `${String(y - years).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return birthDate <= cutoff;
}

export function isOverAYearOld(birthDate: string | null, today: string): boolean {
  return isAtLeastYearsOld(birthDate, today, 1);
}

export function summarizeDashboard(input: {
  animals: DashAnimal[];
  sales: DashSale[];
  slides: DashSlide[];
  posts: DashPost[];
  faqDemoCount: number;
  inquiryEmail: string | null;
  today: string;
  enabledSpecies?: ("horse" | "cattle")[];
}): DashboardSummary {
  const live = input.animals.filter((a) => a.record_scope === "inventory" && !a.archived_at);
  const isPublic = (id: string | null) => {
    const a = id ? live.find((x) => x.id === id) : undefined;
    return Boolean(a?.is_published);
  };
  const saleByAnimal = new Map(input.sales.map((s) => [s.animal_id, s.status]));
  const attention: AttentionItem[] = [];

  if (!input.inquiryEmail) {
    attention.push({
      id: "inquiry-email",
      tone: "action",
      message: "Add the email address where visitor messages should go.",
      href: "/admin/ranch-info",
    });
  }

  const noPhoto = live.filter((a) => !a.primary_media_id);
  if (noPhoto.length) {
    attention.push({
      id: "no-photo",
      tone: "action",
      message: `${noPhoto.length === 1 ? "1 animal has" : `${noPhoto.length} animals have`} no photos yet: ${listNames(noPhoto.map((a) => a.name))}.`,
      href: "/admin/animals?show=no-photo",
    });
  }

  for (const [categoryId, info] of Object.entries(growthSuggestions)) {
    const grown = live.filter(
      (a) =>
        a.category_id === categoryId &&
        !a.category_confirmed_at &&
        isAtLeastYearsOld(a.birth_date, input.today, info.years),
    );
    if (grown.length) {
      const age = info.years === 1 ? "a year" : `${info.years} years`;
      attention.push({
        id: `grown-${categoryId}`,
        tone: "action",
        message: `${listNames(grown.map((a) => a.name))} ${grown.length === 1 ? "is" : "are"} over ${age} old. Move ${grown.length === 1 ? "it" : "them"} to ${info.next}?`,
        href: `/admin/animals?show=${categoryId}`,
      });
    }
  }

  for (const s of input.slides.filter((s) => s.is_active && !s.archived_at)) {
    if (!s.media_id) {
      attention.push({
        id: `slide-photo-${s.id}`,
        tone: "action",
        message: `Homepage slide “${s.headline}” needs a photo.`,
        href: "/admin/homepage",
      });
    }
    if (s.cta_kind === "animal" && !isPublic(s.cta_animal_id)) {
      attention.push({
        id: `slide-link-${s.id}`,
        tone: "action",
        message: `Homepage slide “${s.headline}” links to an animal that isn't on the website.`,
        href: "/admin/homepage",
      });
    }
  }

  const draftAnimals = live.filter((a) => !a.is_published).length;
  if (draftAnimals) {
    attention.push({
      id: "draft-animals",
      tone: "info",
      message: `${draftAnimals === 1 ? "1 animal is" : `${draftAnimals} animals are`} hidden from the website.`,
      href: "/admin/animals?show=hidden",
    });
  }
  const draftPosts = input.posts.filter((p) => p.status === "draft" && !p.archived_at).length;
  if (draftPosts) {
    attention.push({
      id: "draft-posts",
      tone: "info",
      message: `${draftPosts === 1 ? "1 ranch update is" : `${draftPosts} ranch updates are`} saved as a draft.`,
      href: "/admin/updates",
    });
  }

  const demo =
    live.filter((a) => a.is_demo).length +
    input.posts.filter((p) => p.is_demo && !p.archived_at).length +
    input.slides.filter((s) => s.is_demo && !s.archived_at).length +
    input.faqDemoCount;
  if (demo) {
    attention.push({
      id: "demo",
      tone: "info",
      message: `${demo} sample items are standing in for real content. Replace them before the website launches.`,
      href: "/admin/animals?show=sample",
    });
  }

  const publicLive = live.filter((a) => a.is_published);
  const species = input.enabledSpecies ?? ["horse", "cattle"];
  const stats = [
    {
      label: "Horses",
      value: publicLive.filter((a) => a.species === "horse").length,
      href: "/admin/animals?species=horse",
    },
    {
      label: "Cattle",
      value: publicLive.filter((a) => a.species === "cattle").length,
      href: "/admin/animals?species=cattle",
    },
    {
      label: "For sale",
      value: publicLive.filter((a) => ["available", "pending"].includes(saleByAnimal.get(a.id) ?? "")).length,
      href: "/admin/animals?show=for-sale",
    },
    {
      label: "Ranch updates",
      value: input.posts.filter((p) => p.status === "published" && !p.archived_at).length,
      href: "/admin/updates",
    },
  ].filter(
    (s) => (s.label !== "Horses" || species.includes("horse")) && (s.label !== "Cattle" || species.includes("cattle")),
  );

  return { stats, attention };
}
