/**
 * Plain-language messages for authentication and database errors.
 * Owners never see raw codes like "invalid_credentials" or "23505".
 */
type AuthLikeError = { code?: string; status?: number; message?: string } | null | undefined;

const authMessages: Record<string, string> = {
  invalid_credentials: "That email and password don't match our records.",
  over_request_rate_limit: "Too many attempts. Wait a few minutes, then try again.",
  over_email_send_rate_limit: "We've sent several emails already. Wait a few minutes, then try again.",
  weak_password: "Choose a stronger password: at least 10 characters with letters and numbers.",
  same_password: "Choose a password you haven't used here before.",
  reauthentication_needed: "For your security, sign in again before changing your password.",
  mfa_verification_failed: "That code didn't work. Codes change every 30 seconds — enter the newest one.",
  mfa_challenge_expired: "That code expired. Enter the newest code from your app.",
  insufficient_aal: "Enter the code from your authenticator app to continue.",
  otp_expired: "That link has expired or was already used. Request a new one.",
  session_not_found: "Your session ended. Please sign in again.",
  session_expired: "Your session ended. Please sign in again.",
  user_banned: "This account is disabled. Contact Elevartemis for help.",
  email_address_invalid: "Enter a valid email address.",
  email_provider_disabled: "Email sign-in isn't available right now. Contact Elevartemis for help.",
  signup_disabled: "Sign-ups are closed. Ask Elevartemis for an invitation.",
  too_many_enrolled_mfa_factors: "You've reached the limit of authenticator apps. Remove one first.",
};

export function authErrorMessage(error: AuthLikeError): string {
  if (!error) return "";
  if (error.code && authMessages[error.code]) return authMessages[error.code];
  if (error.status === 429) return authMessages.over_request_rate_limit;
  const generic = "Something went wrong. Please try again.";
  // In development, show the real cause so a generic message never hides it.
  if (process.env.NODE_ENV === "development") {
    const detail = [error.code, error.status, error.message].filter(Boolean).join(" · ");
    console.error("[auth] unmapped error:", error);
    return detail ? `${generic} [dev: ${detail}]` : generic;
  }
  return generic;
}

type DbLikeError = { code?: string; message?: string } | null | undefined;

/** Database errors: our RA0xx rules already carry owner-friendly messages. */
export function dbErrorMessage(error: DbLikeError): string {
  if (!error) return "";
  const code = error.code ?? "";
  if (/^RA\d{3}$/.test(code) && error.message) return error.message;
  switch (code) {
    case "23505":
      return "That's already in use. Try a different name or web address.";
    case "23503":
      return "That item is linked to something that no longer exists. Refresh the page and try again.";
    case "23514":
    case "22001":
    case "22P02":
      return "Some of the information isn't valid. Check the highlighted fields and try again.";
    case "42501":
    case "PGRST301":
      return "You don't have permission to do that. Try signing in again.";
    // A column or table the code expects isn't in the database: its update (migration) hasn't been applied yet.
    case "PGRST204":
    case "PGRST205":
    case "42703":
    case "42P01":
      return "This part of the site needs a database update that hasn't been applied yet. Ask your site developer to apply the latest updates.";
    default:
      return "Something went wrong and nothing was saved. Please try again.";
  }
}
