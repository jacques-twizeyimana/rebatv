import { z } from "zod";
import { SLUG_RE } from "./slug";

const httpsUrl = z
  .string()
  .trim()
  .max(600)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a full https:// URL");

const optionalHttpsUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(httpsUrl.nullable());

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

export const channelSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  shortName: z
    .string()
    .trim()
    .min(1, "Required")
    .max(12, "12 characters max")
    .transform((v) => v.toUpperCase()),
  slug: z.string().trim().toLowerCase().min(1, "Required").max(64).regex(SLUG_RE, "Lowercase letters, numbers and dashes"),
  genre: z.string().trim().min(1, "Required").max(60),
  hue: z.coerce.number().int().min(0).max(359),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Pick a country"),
  streamUrl: optionalHttpsUrl,
  logoUrl: optionalHttpsUrl,
  description: z
    .string()
    .trim()
    .max(400)
    .transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
  isActive: checkbox,
});

export type ChannelInput = z.infer<typeof channelSchema>;

export const countrySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Two-letter ISO code"),
  name: z.string().trim().min(1, "Required").max(80),
  isMarket: checkbox,
  heroChannelId: z
    .string()
    .trim()
    .transform((v) => v || null),
  heroBlurb: z
    .string()
    .trim()
    .max(280)
    .transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(1, "Enter your password").max(256),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}
