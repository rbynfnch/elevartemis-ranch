/**
 * What a visitor's message to the ranch must look like, and the checks that keep the Contact form from being
 * abused. Pure rules, no database: the server action applies them and the form shows their messages.
 */
import { z } from "zod";
import type { Species } from "@/lib/domain/species";

export const LIMITS = { name: 120, email: 200, topic: 120, message: 4000 } as const;

const MIN_FILL_MS = 3_000; // a person takes longer than this to fill in a form; a script doesn't
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(LIMITS.name, `Use ${LIMITS.name} characters or fewer.`),
  email: z
    .string()
    .trim()
    .max(LIMITS.email, "That email address is too long.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address, like name@example.com."),
  topic: z.string().trim().max(LIMITS.topic).default(""),
  message: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(LIMITS.message, `Keep your message under ${LIMITS.message} characters.`),
  /** The animal's page address, from an Inquire button. */
  animal: z.string().trim().max(200).default(""),
  /** A hidden box people never see or fill in; a script usually does. */
  website: z.string().default(""),
  /** When the form was shown (milliseconds since 1970). */
  startedAt: z.coerce.number().default(0),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

/** True when the form looks filled in by a script: the hidden box has something in it, or it was sent too fast or too stale. */
export function looksAutomated(input: Pick<InquiryInput, "website" | "startedAt">, now = Date.now()): boolean {
  if (input.website.trim() !== "") return true;
  const age = now - input.startedAt;
  return !Number.isFinite(age) || age < MIN_FILL_MS || age > MAX_AGE_MS;
}

/** Enough messages from one address or to one ranch in a short while is too many. */
export const RATE = { windowMinutes: 10, perEmail: 3, perRanch: 30 } as const;

/** The choices under "I'm interested in…", from what the ranch actually has. */
export function topicOptions(species: Species[], animalName?: string | null): string[] {
  return [
    ...(animalName ? [`${animalName}`] : []),
    "A question about the ranch",
    ...(species.includes("horse") ? ["Horses"] : []),
    ...(species.includes("cattle") ? ["Cattle"] : []),
    "Something else",
  ];
}

export function emailSubject(input: { name: string; topic: string }): string {
  return `New message from ${input.name}${input.topic ? `: ${input.topic}` : ""}`;
}

/** The plain-text email the ranch receives. */
export function emailBody(input: {
  name: string;
  email: string;
  topic: string;
  animalName?: string | null;
  message: string;
}): string {
  return [
    `From: ${input.name} <${input.email}>`,
    input.topic ? `Interested in: ${input.topic}` : null,
    input.animalName && input.animalName !== input.topic ? `About: ${input.animalName}` : null,
    "",
    input.message,
    "",
    "Reply to this email to answer them. The message is also saved under Messages in your admin.",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
