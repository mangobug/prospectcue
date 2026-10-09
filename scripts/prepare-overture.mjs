import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  statSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { z } from 'zod';

const [input, output, release, editorDirectory] = process.argv.slice(2);
if (!input || !output || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release || '')) {
  console.error(
    'Usage: node scripts/prepare-overture.mjs INPUT.ndjson OUTPUT.sql YYYY-MM-DD.VERSION [SQL_EDITOR_DIRECTORY]',
  );
  process.exit(1);
}
if (statSync(input).size > 100 * 1024 * 1024)
  throw new Error('Use a regional export smaller than 100 MB');
if (resolve(input) === resolve(output))
  throw new Error('Input and output must differ');
if (
  editorDirectory &&
  existsSync(editorDirectory) &&
  readdirSync(editorDirectory).length
)
  throw new Error(
    'Use a new or empty SQL Editor output directory to avoid mixing releases',
  );
const provinces = {
  ON: 'Ontario',
  QC: 'Quebec',
  BC: 'British Columbia',
  AB: 'Alberta',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  PE: 'Prince Edward Island',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  YT: 'Yukon',
};
const string = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
function website(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      u.toString().length <= 2048
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
const schema = z.object({
  id: z.string().min(1).max(100),
  business_name: z.string().min(1).max(200),
  industry: z.string().max(100),
  categories: z.array(z.string()).max(50),
  website_url: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().max(100),
  province: z.string().max(100),
  country: z.string().max(100),
  address: z.string().max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  release: z.string(),
  attributions: z.array(
    z.object({
      name: z.string(),
      url: z.string().optional(),
      record_id: z.string().optional(),
      property: z.string().optional(),
      update_time: z.string().optional(),
    }),
  ),
});
const rows = [];
const closed = [];
let rejected = 0;
for (const line of readFileSync(input, 'utf8')
  .split('\n')
  .filter((s) => s.trim())) {
  try {
    const raw = JSON.parse(line);
    const p = raw.properties || raw;
    if (['closed', 'permanently_closed'].includes(p.operating_status)) {
      if (
        typeof (p.id || raw.id) === 'string' &&
        (p.id || raw.id).length <= 100
      )
        closed.push(p.id || raw.id);
      rejected++;
      continue;
    }
    const address = p.addresses?.[0] || {};
    const countryCode = string(address.country, 2).toUpperCase();
    let country = countryCode;
    try {
      country =
        new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ||
        countryCode;
    } catch {
      /* Preserve unknown region code. */
    }
    const province =
      countryCode === 'CA'
        ? provinces[
            string(address.region, 100).split('-').at(-1).toUpperCase()
          ] || string(address.region, 100)
        : string(address.region, 100);
    const categories = [
      p.basic_category,
      p.categories?.primary,
      ...(p.categories?.alternate || []),
      ...(typeof p.taxonomy?.primary === 'string'
        ? [p.taxonomy.primary]
        : Array.isArray(p.taxonomy?.primary)
          ? p.taxonomy.primary
          : []),
      ...(Array.isArray(p.taxonomy?.hierarchy) ? p.taxonomy.hierarchy : []),
    ]
      .filter((s) => typeof s === 'string')
      .map((s) => string(s, 100))
      .slice(0, 50);
    const coordinates = raw.geometry?.coordinates || [
      p.bbox?.xmin,
      p.bbox?.ymin,
    ];
    const row = schema.parse({
      id: p.id || raw.id,
      business_name: string(p.names?.primary, 200),
      industry: string(
        p.basic_category || p.categories?.primary || categories.at(-1) || '',
        100,
      ).replaceAll('_', ' '),
      categories,
      website_url: (p.websites || []).map(website).find(Boolean) || null,
      phone: string(p.phones?.[0], 50) || null,
      city: string(address.locality, 100),
      province,
      country,
      address: string(
        address.freeform ||
          [address.locality, province, country].filter(Boolean).join(', '),
        500,
      ),
      longitude: coordinates?.[0],
      latitude: coordinates?.[1],
      release,
      attributions: [
        {
          name: 'Overture Maps Places',
          url: 'https://docs.overturemaps.org/guides/places/',
        },
        ...(p.sources || []).slice(0, 20).map((s) => ({
          name: string(s.dataset || s.record_id || 'Overture contributor', 200),
          record_id: string(s.record_id, 1000),
          property: string(s.property, 100),
          update_time: string(s.update_time, 100),
        })),
      ],
    });
    rows.push(row);
  } catch {
    rejected++;
  }
}
if (!rows.length)
  throw new Error('No valid Overture records; no output was written');
mkdirSync(dirname(resolve(output)), { recursive: true });
const licenses = ['CDLA-Permissive-2.0.txt', 'Apache-2.0.txt']
  .map((name) =>
    readFileSync(new URL(`../docs/licenses/${name}`, import.meta.url), 'utf8')
      .split('\n')
      .map((line) => `-- ${line}`)
      .join('\n'),
  )
  .join('\n--\n');
const header =
  '-- Regional Overture Places catalogue. Public business data; no credentials.\n-- Run after the discovery migrations. Preserve this notice and contributor metadata.\n-- Overture Places sources/licenses: https://docs.overturemaps.org/attribution/\n' +
  licenses +
  '\nbegin;\n';
const footer = "notify pgrst,'reload schema';\ncommit;\n";
function insertSql(batch) {
  const json = JSON.stringify(batch).replaceAll("'", "''");
  return `insert into public.discovery_places(id,business_name,industry,categories,website_url,phone,city,province,country,address,latitude,longitude,release,attributions)\nselect id,business_name,industry,categories,website_url,phone,city,province,country,address,latitude,longitude,release,attributions from jsonb_to_recordset('${json}'::jsonb) as r(id text,business_name text,industry text,categories text[],website_url text,phone text,city text,province text,country text,address text,latitude double precision,longitude double precision,release text,attributions jsonb)\non conflict(id) do update set business_name=excluded.business_name,industry=excluded.industry,categories=excluded.categories,website_url=excluded.website_url,phone=excluded.phone,city=excluded.city,province=excluded.province,country=excluded.country,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,release=excluded.release,attributions=excluded.attributions,imported_at=now();\n`;
}
// Remove explicitly closed listings from discovery. Saved prospects keep their provenance.
const cleanup = closed.length
  ? `delete from public.discovery_places where id in (select jsonb_array_elements_text('${JSON.stringify(closed).replaceAll("'", "''")}'::jsonb));\n`
  : '';
writeFileSync(output, header, { mode: 0o600 });
for (let i = 0; i < rows.length; i += 250)
  appendFileSync(output, insertSql(rows.slice(i, i + 250)));
appendFileSync(output, cleanup + footer);

if (editorDirectory) {
  mkdirSync(editorDirectory, { recursive: true });
  // Supabase Studio checks ~0.98 MB. Leave headroom for UTF-8 and request encoding.
  const maxBytes = 700000;
  const baseBytes =
    Buffer.byteLength(header + insertSql([]) + cleanup + footer) + 1024;
  const dental = (row) =>
    /dentist|dental/i.test(
      `${row.industry} ${row.categories.join(' ')} ${row.business_name}`,
    );
  const groups = [
    { name: 'dentists', rows: rows.filter(dental) },
    { name: 'places', rows: rows.filter((row) => !dental(row)) },
  ];
  const batches = [];
  for (const group of groups) {
    let batch = [],
      bytes = baseBytes;
    for (const row of group.rows) {
      const rowBytes =
        Buffer.byteLength(JSON.stringify(row).replaceAll("'", "''")) + 1;
      if (baseBytes + rowBytes > maxBytes)
        throw new Error('A record exceeds the SQL Editor batch size');
      if (batch.length && bytes + rowBytes > maxBytes) {
        batches.push({ name: group.name, rows: batch });
        batch = [];
        bytes = baseBytes;
      }
      batch.push(row);
      bytes += rowBytes;
    }
    if (batch.length) batches.push({ name: group.name, rows: batch });
  }
  const manifest = [];
  for (const [index, batch] of batches.entries()) {
    const name = `${String(index + 1).padStart(3, '0')}-${batch.name}.sql`;
    const sql =
      `-- Part ${index + 1} of ${batches.length}; ${batch.rows.length} catalogue records.\n` +
      header +
      insertSql(batch.rows) +
      (index === batches.length - 1 ? cleanup : '') +
      footer;
    const bytes = Buffer.byteLength(sql);
    if (bytes > maxBytes)
      throw new Error('Generated SQL Editor file exceeds its byte limit');
    writeFileSync(resolve(editorDirectory, name), sql, { mode: 0o600 });
    manifest.push({ file: name, records: batch.rows.length, bytes });
  }
  writeFileSync(
    resolve(editorDirectory, 'manifest.json'),
    JSON.stringify(
      { release, records: rows.length, maxBytes, files: manifest },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
  console.log(
    `Prepared ${batches.length} standalone SQL Editor files, each below ${maxBytes} bytes; dentist listings first.`,
  );
}
console.log(
  `Prepared ${rows.length} catalogue records; ${rejected} invalid/closed records excluded. No contact values logged.`,
);
