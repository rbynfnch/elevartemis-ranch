/** What a ranch should have in place before going live. Pure: the screen supplies the counts. */
export type LaunchFacts = {
  tagline: boolean;
  phone: boolean;
  publishedAnimals: number;
  animalsWithoutPhoto: number;
  sampleAnimals: number;
  homepageSlides: number;
  aboutFilled: boolean;
  messageEmail: boolean;
  homeSeoWritten: boolean;
  publishedPosts: number;
};

export type LaunchCheck = {
  key: string;
  label: string;
  detail: string;
  ok: boolean;
  /** A required item blocks going live; the rest are recommended. */
  required: boolean;
  href: string;
};

export function launchChecks(f: LaunchFacts): LaunchCheck[] {
  return [
    {
      key: "tagline",
      label: "A tagline",
      detail: "One line about the ranch. It is the first thing search engines and visitors read.",
      ok: f.tagline,
      required: true,
      href: "/admin/ranch-info",
    },
    {
      key: "animals",
      label: "At least one animal on the website",
      detail:
        f.publishedAnimals > 0
          ? `${f.publishedAnimals} shown on your site.`
          : "Add an animal and leave it set to show on the website.",
      ok: f.publishedAnimals > 0,
      required: true,
      href: "/admin/animals",
    },
    {
      key: "samples",
      label: "No sample animals left",
      detail:
        f.sampleAnimals > 0
          ? `${f.sampleAnimals} sample ${f.sampleAnimals === 1 ? "animal is" : "animals are"} still on your site. Replace or remove them.`
          : "All the animals on your site are yours.",
      ok: f.sampleAnimals === 0,
      required: true,
      href: "/admin/animals?show=sample",
    },
    {
      key: "photos",
      label: "A photo for every animal",
      detail:
        f.animalsWithoutPhoto > 0
          ? `${f.animalsWithoutPhoto} ${f.animalsWithoutPhoto === 1 ? "animal has" : "animals have"} no photo yet.`
          : "Every animal has a main photo.",
      ok: f.animalsWithoutPhoto === 0,
      required: false,
      href: "/admin/animals?show=no-photo",
    },
    {
      key: "homepage",
      label: "A homepage slide",
      detail: "Big photos with a headline at the top of your home page.",
      ok: f.homepageSlides > 0,
      required: false,
      href: "/admin/homepage",
    },
    {
      key: "about",
      label: "Your About page",
      detail: "Your story, in your own words.",
      ok: f.aboutFilled,
      required: false,
      href: "/admin/about-page",
    },
    {
      key: "phone",
      label: "A phone number",
      detail: "Shown on the Contact page, and visitors on a phone can tap to call.",
      ok: f.phone,
      required: false,
      href: "/admin/ranch-info",
    },
    {
      key: "email",
      label: "Where new messages are emailed",
      detail: "Messages are always saved, but an email tells you right away.",
      ok: f.messageEmail,
      required: false,
      href: "/admin/contact-page",
    },
    {
      key: "seo",
      label: "A search title and description for your home page",
      detail: "What Google shows for your site.",
      ok: f.homeSeoWritten,
      required: false,
      href: "/admin/search-engines",
    },
    {
      key: "posts",
      label: "A first post",
      detail: "Stories help people find and trust you.",
      ok: f.publishedPosts > 0,
      required: false,
      href: "/admin/updates",
    },
  ];
}

export const canGoLive = (checks: LaunchCheck[]) => checks.filter((c) => c.required).every((c) => c.ok);
