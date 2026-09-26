import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import type { NavItem } from "@/lib/site/navigation";
import { MobileMenu } from "./mobile-menu";

type Props = {
  brand: { wordmark: string; subtitle: string | null; mark: string | null };
  items: NavItem[];
};

export function SiteHeader({ brand, items }: Props) {
  return (
    <header className="relative z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-6 px-[var(--gutter)] py-4">
        <Wordmark name={brand.wordmark} subtitle={brand.subtitle} mark={brand.mark} />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.9375rem]">
            {items.map((item) => (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center no-underline decoration-accent decoration-2 underline-offset-8 hover:underline"
                >
                  {item.label}
                </Link>
                {item.children ? (
                  <ul className="invisible absolute left-1/2 top-full z-40 min-w-56 -translate-x-1/2 translate-y-1 border border-rule bg-paper py-2 opacity-0 shadow-[0_12px_30px_-18px_rgb(30_42_35/0.45)] transition duration-200 ease-[var(--ease-out)] group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.heading ? (
                      <li aria-hidden="true" className="px-5 pb-1 pt-2 font-serif text-sm italic text-ink-muted">
                        {item.heading}
                      </li>
                    ) : null}
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block px-5 py-2 no-underline hover:bg-surface focus-visible:bg-surface"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <MobileMenu items={items} />
      </div>
    </header>
  );
}
