import type { Metadata, Viewport } from "next";
// Self-hosted fonts (Fontsource). Only @font-face rules are loaded here; the
// browser downloads a font file only when a ranch's preset actually uses it.
import "@fontsource/libre-caslon-display/400.css";
import "@fontsource/libre-caslon-text/400.css";
import "@fontsource/libre-caslon-text/400-italic.css";
import "@fontsource-variable/libre-franklin/index.css";
import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/source-sans-3/index.css";
import "./globals.css";

export const metadata: Metadata = {
  // Each ranch site and the admin set their own titles and robots rules.
  title: "Ranch",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e2a23",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
