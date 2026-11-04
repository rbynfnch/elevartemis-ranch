import "server-only";

/**
 * Emails the ranch a new message through Resend, when it's set up (RESEND_API_KEY and INQUIRY_FROM_ADDRESS).
 * It never throws: a message is already saved before this runs, so a failed email loses nothing.
 */
export async function sendInquiryEmail(mail: {
  to: string;
  cc: string[];
  replyTo: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM_ADDRESS;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [mail.to],
        ...(mail.cc.length ? { cc: mail.cc } : {}),
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
