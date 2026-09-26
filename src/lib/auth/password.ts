import { z } from "zod";

/** Matches supabase/config.toml: at least 10 characters with letters and digits. */
export const passwordRules = "At least 10 characters, with at least one letter and one number.";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const newPasswordFormSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match." });
