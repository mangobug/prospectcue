import { z } from 'zod';
export const findingSchema = z.object({
  id: z.string().max(80),
  title: z.string().max(160),
  status: z.enum(['issue', 'pass', 'unknown']),
  evidence: z.string().max(1500),
  recommendation: z.string().max(600),
});
export const reportSchema = z.object({
  version: z.literal(1),
  finalUrl: z
    .url()
    .max(2048)
    .refine((v) => /^https?:\/\//.test(v), 'Expected a public website URL'),
  httpStatus: z.number().int().min(100).max(599),
  checkedAt: z.iso.datetime(),
  viewport: z.object({ width: z.literal(390), height: z.literal(844) }),
  findings: z.array(findingSchema).max(30),
  limitations: z.array(z.string().max(600)).max(10),
  pageSpeed: z.object({
    status: z.enum(['available', 'unavailable']),
    performance: z.number().min(0).max(100).nullable(),
    accessibility: z.number().min(0).max(100).nullable(),
    seo: z.number().min(0).max(100).nullable(),
    lcpMs: z.number().nonnegative().nullable(),
    cls: z.number().nonnegative().nullable(),
    measuredAt: z.string().max(80).nullable(),
  }),
});
export type AuditReport = z.infer<typeof reportSchema>;
export type Finding = z.infer<typeof findingSchema>;
export const auditInput = z
  .object({ url: z.string().trim().min(1).max(2048) })
  .strict();
export const packetSchema = z.object({
  runId: z.uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  assetPath: z.string().max(200),
  uploadToken: z.string().max(5000),
});
