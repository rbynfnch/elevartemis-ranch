import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/admin/[ranch]/login">) {
  return (
    <>
      <h1 className="font-display text-3xl">Sign in</h1>
      <Suspense fallback={<div className="h-80" />}>
        <Login searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/admin/[ranch]/login">["searchParams"] }) {
  const params = await searchParams;
  const linkError = params.error === "link";
  return <LoginForm next={safeNext(params.next)} linkError={linkError} />;
}
