import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

it('exports complete, byte-bounded SQL Editor transactions with safe text and retry protection', () => {
  const root = mkdtempSync(join(tmpdir(), 'prospectcue-export-'));
  try {
    const rows = Array.from({ length: 1400 }, (_, i) => ({
      id: `fictional-export-${i}`,
      names: { primary: `Fictional O'Brien 🦷 clinic ${i}` },
      basic_category: i < 17 ? 'dentist' : 'plumber',
      addresses: [
        {
          locality: 'Fictional QA city',
          region: 'ON',
          country: 'CA',
          freeform: 'é'.repeat(450),
        },
      ],
      bbox: { xmin: -81, ymin: 43 },
      sources: [{ dataset: 'Fictional QA contributor', record_id: 'fixture' }],
    }));
    const closed = {
      ...rows[0],
      id: 'fictional-closed',
      operating_status: 'permanently_closed',
    };
    const input = join(root, 'input.ndjson'),
      output = join(root, 'full.sql'),
      directory = join(root, 'parts');
    writeFileSync(
      input,
      [...rows, closed].map((row) => JSON.stringify(row)).join('\n'),
    );
    const args = [
      resolve('scripts/prepare-overture.mjs'),
      input,
      output,
      '2026-09-23.1',
      directory,
    ];
    execFileSync('node', args, { stdio: 'pipe' });
    const manifest = JSON.parse(
      readFileSync(join(directory, 'manifest.json'), 'utf8'),
    ) as {
      records: number;
      files: { file: string; bytes: number; records: number }[];
    };
    expect(manifest.records).toBe(1400);
    expect(manifest.files.length).toBeGreaterThan(2);
    expect(manifest.files[0].file).toBe('001-dentists.sql');
    const exported: { id: string; business_name: string; country: string }[] =
      [];
    for (const [index, file] of manifest.files.entries()) {
      const sql = readFileSync(join(directory, file.file), 'utf8');
      expect(Buffer.byteLength(sql)).toBe(file.bytes);
      expect(file.bytes).toBeLessThanOrEqual(700000);
      expect(sql).toContain('Community Data License Agreement');
      expect(sql).toContain('begin;');
      expect(sql.endsWith('commit;\n')).toBe(true);
      const match = sql.match(/jsonb_to_recordset\('(.+)'::jsonb\)/);
      expect(match).not.toBeNull();
      const batch = JSON.parse(match![1].replaceAll("''", "'"));
      expect(batch).toHaveLength(file.records);
      exported.push(...batch);
      expect(sql.includes('delete from public.discovery_places')).toBe(
        index === manifest.files.length - 1,
      );
    }
    expect(new Set(exported.map((row) => row.id)).size).toBe(1400);
    expect(exported.map((row) => row.id).sort()).toEqual(
      rows.map((row) => row.id).sort(),
    );
    expect(exported[0]).toMatchObject({
      business_name: "Fictional O'Brien 🦷 clinic 0",
      country: 'Canada',
    });
    // Stale parts from another run must never silently enter an operator's import.
    expect(() => execFileSync('node', args, { stdio: 'pipe' })).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
