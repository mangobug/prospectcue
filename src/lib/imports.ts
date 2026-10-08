import Papa from 'papaparse';
import { z } from 'zod';
import { duplicateKey, prospectSchema, type ProspectInput } from './validation';
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 1000;
export const importFields = [
  'business_name',
  'industry',
  'website_url',
  'email',
  'phone',
  'city',
  'province',
  'country',
  'website_status',
  'source_reference',
] as const;
export type ImportField = (typeof importFields)[number];
export type Mapping = Partial<Record<ImportField, string>>;
export const mappingSchema = z
  .partialRecord(z.enum(importFields), z.string().max(200))
  .refine((m) => !!m.business_name, 'Map the business name column')
  .refine((m) => {
    const vals = Object.values(m).filter(Boolean);
    return new Set(vals).size === vals.length;
  }, 'Map each CSV column only once');
export function parseCsv(csv: string) {
  if (new TextEncoder().encode(csv).length > MAX_BYTES)
    throw new Error('CSV exceeds the 2 MB limit');
  // Dynamic typing stays disabled so phone numbers and source references remain strings.
  const parsed = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
    delimiter: ',',
  });
  if (parsed.errors.length)
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  const [headers, ...records] = parsed.data;
  if (!headers?.length || !records.length)
    throw new Error('CSV must contain a header and at least one data row');
  if (
    headers.some((h) => !h.trim() || h.length > 200) ||
    new Set(headers).size !== headers.length
  )
    throw new Error(
      'CSV headers must be non-empty, unique and at most 200 characters',
    );
  if (headers.length > 50) throw new Error('CSV supports at most 50 columns');
  if (records.length > MAX_ROWS)
    throw new Error('CSV exceeds the 1,000 row limit');
  return { headers, records };
}
export type PreviewRow = {
  row: number;
  data: ProspectInput | null;
  errors: string[];
  duplicate: boolean;
  duplicateReason?: string;
  raw: string[];
};
export function validateRows(
  csv: string,
  mapping: Mapping,
  existingKeys: Set<string> = new Set(),
): PreviewRow[] {
  const { headers, records } = parseCsv(csv);
  mappingSchema.parse(mapping);
  for (const column of Object.values(mapping))
    if (column && !headers.includes(column))
      throw new Error('Mapped column is missing');
  const seen = new Set<string>();
  return records.map((raw, i) => {
    const input: Record<string, string> = {};
    for (const [field, column] of Object.entries(mapping))
      if (column) input[field] = raw[headers.indexOf(column)] ?? '';
    const result = prospectSchema.safeParse(input);
    const errors =
      raw.length !== headers.length
        ? ['Column count differs from the header']
        : [];
    if (!result.success)
      errors.push(
        ...result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      );
    if (errors.length || !result.success)
      return { row: i + 2, data: null, errors, duplicate: false, raw };
    const key = duplicateKey(result.data);
    const duplicateReason = existingKeys.has(key)
      ? 'Same business name and location in your workspace'
      : seen.has(key)
        ? 'Same business name and location in this file'
        : undefined;
    seen.add(key);
    return {
      row: i + 2,
      data: result.data,
      errors: [],
      duplicate: !!duplicateReason,
      duplicateReason,
      raw,
    };
  });
}
export function feedbackCsv(rows: PreviewRow[]) {
  const safe = (v: string) =>
    /^[\s]*[=+\-@]/.test(v) || /^[\t\r\n]/.test(v) ? `'${v}` : v;
  return Papa.unparse([
    ['Record', 'Errors', 'Original fields'],
    ...rows
      .filter((r) => r.errors.length)
      .map((r) => [
        String(r.row),
        safe(r.errors.join('; ')),
        safe(r.raw.join(' | ')),
      ]),
  ]);
}
