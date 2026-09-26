import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Placeholders so the admin navigation works end to end today. Each section
 * is replaced by its own route folder as it's built (static routes take
 * precedence over this dynamic one).
 */
const sections: Record<string, { title: string; description: string }> = {
  animals: {
    title: "Animals",
    description: "Add and edit your horses and cattle, their photos, pedigrees and sale details.",
  },
  homepage: {
    title: "Homepage",
    description: "Choose up to three large photos for the top of your homepage, with a headline and button.",
  },
  updates: {
    title: "Happening on the Ranch",
    description:
      "Posts about ranch life: new foals, moving cattle, shows and projects. Add old photos and back-date them to build the ranch's history.",
  },
  gallery: { title: "Gallery", description: "Pick the ranch photos that appear in your website's gallery." },
  faqs: { title: "FAQs", description: "Answer the questions visitors ask most." },
  "about-page": { title: "About Page", description: "Tell your ranch's story in words and photos." },
  "ranch-info": {
    title: "Ranch Info",
    description: "Your phone number, location, where messages go, and social media links.",
  },
  "recently-deleted": {
    title: "Recently Deleted",
    description: "Animals you've deleted wait here, so you can restore them or remove them for good.",
  },
};

export async function generateMetadata({ params }: PageProps<"/admin/[ranch]/[section]">): Promise<Metadata> {
  const section = sections[(await params).section];
  return { title: section?.title ?? "Not found" };
}

export default async function SectionPlaceholder({ params }: PageProps<"/admin/[ranch]/[section]">) {
  const section = sections[(await params).section];
  if (!section) notFound();
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">{section.title}</h1>
      <p className="mt-3 text-ink-muted">{section.description}</p>
      <p className="mt-8 border-l-2 border-accent bg-accent/10 px-4 py-3 text-sm">This section is being built.</p>
    </div>
  );
}
