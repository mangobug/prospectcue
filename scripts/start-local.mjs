import { spawnSync } from 'node:child_process';
// Suppress CLI status output containing local keys; status is consumed privately by db:env.
const result = spawnSync(
  'node_modules/.bin/supabase',
  [
    'start',
    '-x',
    'realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector',
  ],
  {
    env: { ...process.env, SUPABASE_INTERNAL_IMAGE_REGISTRY: 'docker.io' },
    stdio: ['ignore', 'ignore', 'inherit'],
  },
);
if (result.error) {
  console.error('Local Supabase CLI could not start');
  process.exit(1);
}
process.exit(result.status ?? 1);
