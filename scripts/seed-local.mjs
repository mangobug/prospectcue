import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env.test');
const url = process.env.TEST_SUPABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Seed is local-only');
const admin = createClient(url, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const account = existsSync('.local-seed.json')
  ? JSON.parse(readFileSync('.local-seed.json', 'utf8'))
  : {
      email: 'fictional-designer@example.invalid',
      password: randomUUID() + 'Aa1!',
    };
const client = createClient(url, process.env.TEST_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
let sign = await client.auth.signInWithPassword(account);
if (sign.error) {
  const { error } = await admin.auth.admin.createUser({
    ...account,
    email_confirm: true,
    user_metadata: { display_name: 'Fictional Designer' },
  });
  if (error)
    throw new Error(
      'Seed account could not be created; check local seed state',
    );
  sign = await client.auth.signInWithPassword(account);
  if (sign.error) throw sign.error;
}
const { data: w, error } = await client.rpc('create_workspace', {
  workspace_name: 'Fictional YXU Sandbox',
});
if (error) throw error;
const { error: importError } = await client.rpc('import_prospects', {
  w,
  token: '21d18d16-09c5-4acd-9785-6a05be0bd499',
  filename: 'fictional-seed.csv',
  invalid_count: 0,
  rows: [
    {
      business_name: 'Fictional Maple & Finch Studio',
      industry: 'Retail',
      city: 'London',
      province: 'Ontario',
      country: 'Canada',
      website_url: 'https://maple-finch.example',
      website_status: 'website_present',
      email: 'maple@example.com',
      phone: '+1 (519) 555-0101',
      row: 2,
    },
    {
      business_name: 'Fictional Riverbend Bakery',
      industry: 'Food',
      city: 'London',
      province: 'Ontario',
      country: 'Canada',
      website_status: 'unknown',
      row: 3,
    },
  ],
});
if (importError) throw new Error('Seed import failed');
writeFileSync('.local-seed.json', JSON.stringify(account, null, 2) + '\n', {
  mode: 0o600,
});
console.log(
  'Fictional seed prepared. Local login is in the ignored .local-seed.json file; no values logged.',
);
