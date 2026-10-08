import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const result = spawnSync(
  'node_modules/.bin/supabase',
  ['gen', 'types', 'typescript', '--local'],
  {
    env: { ...process.env, SUPABASE_INTERNAL_IMAGE_REGISTRY: 'docker.io' },
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  },
);
if (result.status !== 0 || !result.stdout?.includes('export type Database')) {
  console.error(
    'Type generation failed; the existing types were preserved. Check local Supabase.',
  );
  process.exit(result.status || 1);
}
writeFileSync('src/lib/database.types.ts', result.stdout);
console.log('Database types generated from local PostgreSQL.');
