import type { AboutIcon } from "@/lib/site/about";

const paths: Record<AboutIcon, string> = {
  horseshoe: "M9 5v11a7 7 0 0 0 14 0V5M9 9h3M20 9h3M9 14h3M20 14h3",
  mountains: "M2 25 12 8l5 8 3-4 10 13H2ZM9 15l3 2 3-2",
  people:
    "M16 6a3 3 0 1 0 0 .01M7 11a2.5 2.5 0 1 0 0 .01M25 11a2.5 2.5 0 1 0 0 .01M10 25v-4a6 6 0 0 1 12 0v4M2 22v-2a4 4 0 0 1 5-3.7M30 22v-2a4 4 0 0 0-5-3.7",
  plant: "M16 28V15M16 15c0-5-3-8-9-8 0 5 3 8 9 8ZM16 18c0-4 3-7 9-7 0 4-3 7-9 7Z",
  shield: "M16 3 5 7v8c0 7 4.5 11 11 14 6.5-3 11-7 11-14V7L16 3ZM11 16l4 4 7-8",
  tree: "M16 3 8 14h4l-5 8h7v6h4v-6h7l-5-8h4L16 3Z",
  heart: "M16 27S4 19 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19 16 27 16 27Z",
  star: "m16 4 3.6 7.4 8.1 1.1-5.9 5.7 1.4 8.1L16 22.5l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.1L16 4Z",
};

/** A simple outline icon the owner can choose for a highlight or value. Decorative: the text beside it says it all. */
export function AboutIconView({ icon, className }: { icon: AboutIcon; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className ?? "size-9"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[icon]} />
    </svg>
  );
}
