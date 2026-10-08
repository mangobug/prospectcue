import { describe, it, expect } from 'vitest';
import { parseCsv, validateRows, feedbackCsv, MAX_BYTES } from '@/lib/imports';
import {
  duplicateKey,
  normalizeWebsite,
  prospectSchema,
  todayInTimezone,
} from '@/lib/validation';
describe('CSV parsing and validation', () => {
  it('handles BOM, quoted commas, escaped quotes and multiline fields', () => {
    const { records } = parseCsv(
      '\uFEFFname,source\r\n"Fictional, Shop","A ""quoted""\nreference"',
    );
    expect(records).toEqual([['Fictional, Shop', 'A "quoted"\nreference']]);
  });
  it('rejects malformed quotes', () =>
    expect(() => parseCsv('name,city\n"unclosed,London')).toThrow(
      'parse error',
    ));
  it('rejects empty files and duplicate headers', () => {
    expect(() => parseCsv('name,city')).toThrow();
    expect(() => parseCsv('name,name\nA,B')).toThrow('unique');
  });
  it('enforces bytes and record limits', () => {
    expect(() => parseCsv('n\n' + 'a'.repeat(MAX_BYTES))).toThrow('2 MB');
    expect(() => parseCsv('n\n' + Array(1001).fill('A').join('\n'))).toThrow(
      '1,000',
    );
  });
  it('reports row-specific validation and retains valid rows', () => {
    const rows = validateRows(
      'name,url,email\nValid,example.ca,good@example.com\n,ftp://bad.example,nope',
      { business_name: 'name', website_url: 'url', email: 'email' },
    );
    expect(rows[0].data?.website_url).toBe('https://example.ca/');
    expect(rows[1].row).toBe(3);
    expect(rows[1].errors).toHaveLength(3);
  });
  it('reports mismatched column counts', () =>
    expect(
      validateRows('name,city\nA,London,extra', { business_name: 'name' })[0]
        .errors,
    ).toContain('Column count differs from the header'));
  it('defaults blank website to unknown and keeps international phones', () => {
    const p = validateRows('name,phone\nA,+44 (0)20 7946 0100', {
      business_name: 'name',
      phone: 'phone',
    })[0].data;
    expect(p?.website_status).toBe('unknown');
    expect(p?.website_url).toBeNull();
    expect(p?.phone).toBe('+44 (0)20 7946 0100');
  });
  it('does not infer website classification from a social link', () =>
    expect(
      validateRows('name,url\nA,instagram.com/a', {
        business_name: 'name',
        website_url: 'url',
      })[0].data?.website_status,
    ).toBe('unknown'));
  it('requires business name mapping and prevents reused columns', () => {
    expect(() => validateRows('name\nA', {})).toThrow();
    expect(() =>
      validateRows('name\nA', { business_name: 'name', city: 'name' }),
    ).toThrow();
  });
  it('checks file and existing workspace duplicates', () => {
    const rows = validateRows(
      'name,city\nA,London\n a , London \nB,London',
      { business_name: 'name', city: 'city' },
      new Set(['b|london||canada']),
    );
    expect(rows.map((r) => r.duplicate)).toEqual([false, true, true]);
  });
  it('never matches solely by website domain or social domain', () => {
    const rows = validateRows(
      'name,url\nA,instagram.com/a\nB,instagram.com/b\nC,example.ca\nD,example.ca',
      { business_name: 'name', website_url: 'url' },
    );
    expect(rows.every((r) => !r.duplicate)).toBe(true);
  });
  it('escapes spreadsheet formulas including leading whitespace', () => {
    const rows = validateRows('name,email\n" =HYPERLINK(1)",nope', {
      business_name: 'name',
      email: 'email',
    });
    expect(feedbackCsv(rows)).toContain("' =HYPERLINK(1)");
    expect(feedbackCsv(rows)).toContain('email');
  });
});
describe('shared prospect validation', () => {
  it('normalizes HTTP URLs with parser', () => {
    expect(normalizeWebsite('HTTPS://EXAMPLE.CA/path#x')).toBe(
      'https://example.ca/path',
    );
    expect(normalizeWebsite('example.ca')).toBe('https://example.ca/');
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'ftp://example.ca',
    'https://user:pass@example.ca',
    'not a website',
  ])('rejects unsafe or invalid URL %s', (value) =>
    expect(() => normalizeWebsite(value)).toThrow(),
  );
  it('matches conservative names plus location', () => {
    const p = prospectSchema.parse({
      business_name: ' Fictional  Shop ',
      city: 'London',
    });
    expect(duplicateKey(p)).toBe('fictional shop|london||canada');
    expect(duplicateKey({ ...p, city: 'Toronto' })).not.toBe(duplicateKey(p));
  });
  it('validates real dates and stages', () => {
    expect(
      prospectSchema.safeParse({
        business_name: 'A',
        next_follow_up: '2026-02-30',
      }).success,
    ).toBe(false);
    expect(
      prospectSchema.safeParse({ business_name: 'A', stage: 'made-up' })
        .success,
    ).toBe(false);
  });
  it('uses Toronto calendar across UTC midnight and DST', () => {
    expect(
      todayInTimezone('America/Toronto', new Date('2026-10-09T02:00:00Z')),
    ).toBe('2026-10-08');
    expect(
      todayInTimezone('America/Toronto', new Date('2026-03-08T06:00:00Z')),
    ).toBe('2026-03-08');
  });
});
