import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
const status = JSON.parse(
  execFileSync('node_modules/.bin/supabase', ['status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
);
if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname))
  throw new Error('Local services required');
if (!existsSync('.env.local'))
  writeFileSync(
    '.env.local',
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}\nAPP_URL=http://localhost:3000\n`,
    { mode: 0o600 },
  );
if (!existsSync('.env.test'))
  writeFileSync(
    '.env.test',
    `# Local-only test administration; never read by the application.\nTEST_SUPABASE_URL=${status.API_URL}\nTEST_SUPABASE_ANON_KEY=${status.ANON_KEY}\nTEST_SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\n`,
    { mode: 0o600 },
  );
console.log(
  'Local environment files prepared; existing files preserved. No key values logged.',
);
