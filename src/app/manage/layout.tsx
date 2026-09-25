import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Ranch admin", template: "%s | Ranch admin" },
  robots: { index: false, follow: false },
};

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper font-sans text-ink">{children}</div>;
}
