import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl">Reset your password</h1>
      <p className="mt-3 text-ink-muted">
        Enter the email you sign in with. We&apos;ll send you a link to choose a new password.
      </p>
      <ForgotForm />
    </>
  );
}
