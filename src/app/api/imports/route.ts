import { z } from 'zod';
import { api, jsonBody } from '@/lib/api';
import { workspaceContext, ApiError } from '@/lib/context';
import { MAX_BYTES, mappingSchema, validateRows } from '@/lib/imports';
import { duplicateKey } from '@/lib/validation';
const schema = z.object({
  csv: z.string(),
  mapping: mappingSchema,
  filename: z.string().trim().min(1).max(255),
  mode: z.enum(['preview', 'confirm']),
  token: z.uuid(),
  allowRows: z.array(z.number().int().min(2).max(1001)).max(1000).default([]),
});
export async function POST(request: Request) {
  return api(request, async () => {
    const { client, workspace } = await workspaceContext(true);
    const input = schema.parse(
      await jsonBody(request, MAX_BYTES * 6 + 64 * 1024),
    );
    let rows;
    try {
      rows = validateRows(input.csv, input.mapping);
    } catch (e) {
      throw new ApiError(400, e instanceof Error ? e.message : 'Invalid CSV');
    }
    const keys = rows.flatMap((r) => (r.data ? [duplicateKey(r.data)] : []));
    const { data: existing, error } = await client.rpc('duplicate_candidates', {
      w: workspace.id,
      keys,
    });
    if (error) throw new ApiError(503, 'Duplicate check failed');
    rows = validateRows(
      input.csv,
      input.mapping,
      new Set(existing?.map((p) => p.key)),
    );
    if (input.mode === 'preview') return { rows };
    const validRows = rows.flatMap((r) =>
      r.data
        ? [
            {
              ...r.data,
              row: r.row,
              allow_duplicate: input.allowRows.includes(r.row),
            },
          ]
        : [],
    );
    const { data: batch, error: importError } = await client.rpc(
      'import_prospects',
      {
        w: workspace.id,
        token: input.token,
        filename: input.filename,
        rows: validRows,
        invalid_count: rows.filter((r) => r.errors.length).length,
      },
    );
    if (importError)
      throw new ApiError(
        400,
        'Import could not be completed. No rows were saved by this attempt; retry with the same confirmation.',
      );
    return { batch, rows };
  });
}
