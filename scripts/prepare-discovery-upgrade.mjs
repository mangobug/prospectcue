import { readFileSync, writeFileSync } from 'node:fs';
const migrations = [
  '202610080004_discovery.sql',
  '202610080005_discovery_provenance.sql',
];
const parts = [
  '-- GENERATED: node scripts/prepare-discovery-upgrade.mjs; edit migrations instead.',
  '-- Existing ProspectCue first-milestone projects only. No reset, accounts or credentials.',
  '-- Run the entire file once in Supabase SQL Editor. Failure rolls back all changes.',
  'begin;',
  `do $$ begin
    if to_regclass('public.prospects') is null or to_regclass('public.workspace_memberships') is null then
      raise exception 'Initial ProspectCue schema required; use hosted-bootstrap.sql for a NEW project';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='prospects' and column_name='discovery_id') then
      raise exception 'Discovery already installed; do not rerun this upgrade';
    end if;
  end $$;`,
  'create schema if not exists supabase_migrations;',
  'create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);',
];
for (const name of migrations) {
  const [, version, title] = /^(\d+)_(.+)\.sql$/.exec(name);
  parts.push(
    `-- Migration: ${name}`,
    readFileSync(`supabase/migrations/${name}`, 'utf8'),
    `insert into supabase_migrations.schema_migrations(version,name) values('${version}','${title}');`,
  );
}
parts.push('commit;', '');
writeFileSync(
  'supabase/hosted-discovery-upgrade.sql',
  parts.join('\n\n').trimEnd() + '\n',
);
console.log('Prepared transactional discovery upgrade; no data included.');
