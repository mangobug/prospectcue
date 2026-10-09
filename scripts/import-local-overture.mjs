// Operator-only import into the named LOCAL Docker database; never used by Next.js.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
process.loadEnvFile('.env.local');
if (
  !['127.0.0.1', 'localhost'].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error(
    'This catalogue helper requires local Supabase configuration',
  );
const archive = resolve('supabase/catalogue/london-overture-2026-09-23.1.zip');
const sql = execFileSync(
  'python3',
  [
    '-c',
    'import sys,zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("overture-london.sql"))',
    archive,
  ],
  { maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
);
try {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_prospectcue',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
    ],
    { input: sql, stdio: ['pipe', 'ignore', 'pipe'], maxBuffer: 1024 * 1024 },
  );
} catch {
  throw new Error(
    'Local catalogue import failed. Check local Docker and apply discovery migrations first.',
  );
}
console.log(
  'Regional Overture catalogue imported into local Docker PostgreSQL; existing prospects preserved.',
);
