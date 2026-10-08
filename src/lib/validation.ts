import { z } from 'zod';
import { stages, websiteStatuses } from './config';
export function normalizeWebsite(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  const url = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`,
  );
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error('Use an HTTP or HTTPS URL without credentials');
  if (!url.hostname || !url.hostname.includes('.'))
    throw new Error('Use a complete website address');
  url.hash = '';
  return url.toString();
}
const text = (max: number) => z.string().trim().max(max);
const nullableText = (max: number) => text(max).transform((v) => v || null);
export const dateOnly = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number(v.slice(0, 4)) >= 1 &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    'Use a valid date',
  )
  .transform((v) => v || null);
export const prospectSchema = z.object({
  business_name: text(200).min(1, 'Business name is required'),
  industry: text(100).default(''),
  website_url: text(2048)
    .default('')
    .transform((v, ctx) => {
      try {
        return normalizeWebsite(v);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Use a valid HTTP or HTTPS website URL',
        });
        return z.NEVER;
      }
    }),
  website_status: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(websiteStatuses).default('unknown'),
  ),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (v) => !v || z.email().safeParse(v).success,
      'Use a valid email address',
    )
    .default('')
    .transform((v) => v || null),
  phone: nullableText(50).default(null),
  city: text(100).default(''),
  province: text(100).default(''),
  country: text(100).default('Canada'),
  source_reference: nullableText(500).default(null),
  verification_status: z
    .enum(['unverified', 'user_verified'])
    .default('unverified'),
  stage: z.enum(stages).default('new'),
  next_follow_up: dateOnly.default(null),
});
export type ProspectInput = z.output<typeof prospectSchema>;
export const duplicateKey = (
  p: Pick<ProspectInput, 'business_name' | 'city' | 'province' | 'country'>,
) =>
  [p.business_name, p.city, p.province, p.country]
    .map((s) => s.trim().replace(/\s+/g, ' ').toLowerCase())
    .join('|');
export function todayInTimezone(
  timezone = 'America/Toronto',
  now = new Date(),
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((t) => parts.find((p) => p.type === t)!.value)
    .join('-');
}
export const noteSchema = z.object({ note: text(5000).min(1) });
export const workspaceSchema = z.object({ name: text(100).min(1) });
