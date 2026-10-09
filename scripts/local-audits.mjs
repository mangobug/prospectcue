import { randomBytes } from 'node:crypto';
import { readFileSync, appendFileSync, chmodSync } from 'node:fs';
process.loadEnvFile('.env.local');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'APP_URL']) {
  if (
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env[name] || '').hostname,
    )
  )
    throw new Error('Local audit setup requires local app and database URLs');
}
const secret = process.env.AUDIT_JOB_SECRET || randomBytes(32).toString('hex');
if (secret.length < 32)
  throw new Error(
    'Existing audit encryption secret is too short; update it locally',
  );
for (const path of ['.env.local', '.env.test']) {
  const text = readFileSync(path, 'utf8');
  if (!/^AUDIT_JOB_SECRET=/m.test(text))
    appendFileSync(path, `\nAUDIT_JOB_SECRET=${JSON.stringify(secret)}\n`);
  if (path === '.env.local' && !/^AUDIT_LOCAL_WORKER=/m.test(text))
    appendFileSync(path, 'AUDIT_LOCAL_WORKER=1\n');
  chmodSync(path, 0o600);
}
console.log(
  'Local audit worker configuration prepared. Existing settings preserved; no secret values printed.',
);
