import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Website admin", template: "%s | Website admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper font-sans text-ink">{children}</div>;
}
