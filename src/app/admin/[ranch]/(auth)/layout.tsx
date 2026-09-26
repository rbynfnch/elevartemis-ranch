import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";

/** Minimal, focused layout for sign-in screens, branded with the ranch's name. */
export default function AuthLayout({ children, params }: LayoutProps<"/admin/[ranch]">) {
  return (
    <main className="flex min-h-dvh items-start justify-center px-5 py-16 sm:items-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={<p className="mb-8 h-5" />}>
          <RanchName params={params} />
        </Suspense>
        {children}
      </div>
    </main>
  );
}

async function RanchName({ params }: { params: LayoutProps<"/admin/[ranch]">["params"] }) {
  const site = await getSiteSettings((await params).ranch);
  return (
    <p className="mb-8 text-sm font-semibold text-ink-muted">
      {site ? `${site.name} · website admin` : "Website admin"}
    </p>
  );
}
