import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";

type Params = PageProps<"/site/[ranch]/privacy">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "privacy", {
    title: "Privacy",
    description: `How ${site.name} handles the information you send through this website.`,
    path: "/privacy",
  });
}

export default function Privacy({ params }: PageProps<"/site/[ranch]/privacy">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}

async function Page({ params }: { params: Params }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  const phone = site.profile.publicPhone;

  return (
    <div className="mx-auto max-w-[48rem] px-[var(--gutter)] py-12 lg:py-16">
      <h1 className="font-display text-4xl">Privacy</h1>
      <div className="prose-ranch mt-8 space-y-6 text-ink-muted">
        <p>
          This page explains, in plain words, what {site.name} does with information you give us through this website.
        </p>

        <h2>What we collect</h2>
        <p>
          If you send us a message from the Contact page, we receive your name, your email address, your message and, if
          you came from an animal&apos;s page, which animal you asked about. We collect nothing else about you through
          that form.
        </p>

        <h2>How we use it</h2>
        <p>
          We use it to read your message and answer you. Messages are kept in our website&apos;s inbox and may also be
          emailed to us. We do not sell your information or share it with advertisers.
        </p>

        <h2>Cookies and tracking</h2>
        <p>
          {site.seo.ga4Id
            ? "We use Google Analytics to count visits and see which pages people read. It uses cookies and shares anonymous visit information with Google. We do not use advertising cookies."
            : "This website does not use advertising cookies or tracking tools. Our website host keeps ordinary technical records (such as the pages requested) to keep the site running and secure."}
        </p>

        <h2>Your choices</h2>
        <p>
          You can ask us to show you, correct or delete anything you have sent us. Just{" "}
          <Link href="/contact">contact us</Link>
          {phone ? ` or call ${phone}` : ""}.
        </p>
      </div>
    </div>
  );
}
