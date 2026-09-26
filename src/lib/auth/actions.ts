"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { authErrorMessage } from "./messages";
import { newPasswordFormSchema } from "./password";

export type FormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const emailLinkTypes = ["invite", "recovery", "email", "magiclink", "email_change"] as const;
type EmailLinkType = (typeof emailLinkTypes)[number];

/** Called when the owner clicks "Continue" on /auth/confirm (never on page load). */
export async function verifyEmailLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailLinkType;
  // Where to go next depends only on the kind of link, never on the URL.
  const next =
    type === "invite" ? "/admin/set-password?welcome=1" : type === "recovery" ? "/admin/set-password" : "/admin";
  if (!tokenHash || !emailLinkTypes.includes(type)) redirect("/admin/login?error=link");

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/admin/login?error=link");
  redirect(next);
}

/** Sets a new password (invitation, reset, or change from Account). */
export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordFormSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, message: "Check the highlighted fields." };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "Your link has expired. Request a new password reset email." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: authErrorMessage(error) };

  const destination = formData.get("then");
  if (destination === "dashboard") redirect("/admin?password=set");
  return { ok: true, message: "Password updated." };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
