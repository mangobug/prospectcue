// Cloud Docker vfs workaround only. Does not change application/database code.
// Crane verifies OCI blobs by digest; its own binary is checked against official release checksums.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });
if (run('docker', ['info', '--format', '{{.Driver}}']).trim() !== 'vfs') {
  console.log('Flattening not needed with this storage driver.');
  process.exit(0);
}
const tag = 'supabase/postgres:17.6.1.075';
try {
  run('docker', ['image', 'inspect', tag]);
  console.log('PostgreSQL image already present.');
  process.exit(0);
} catch {}
const dir = mkdtempSync(join(tmpdir(), 'prospectcue-image-'));
try {
  const release =
    'https://github.com/google/go-containerregistry/releases/download/v0.20.3';
  const archive = 'go-containerregistry_Linux_x86_64.tar.gz';
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('This cloud helper requires Linux x64');
  run('curl', [
    '-fsSL',
    `${release}/checksums.txt`,
    '-o',
    join(dir, 'checksums.txt'),
  ]);
  run('curl', ['-fsSL', `${release}/${archive}`, '-o', join(dir, archive)]);
  const expected = readFileSync(join(dir, 'checksums.txt'), 'utf8')
    .split('\n')
    .find((l) => l.endsWith(` ${archive}`))
    ?.split(/\s+/)[0];
  const actual = createHash('sha256')
    .update(readFileSync(join(dir, archive)))
    .digest('hex');
  if (!expected || expected !== actual)
    throw new Error('Crane archive checksum mismatch');
  run('tar', ['-xzf', join(dir, archive), '-C', dir, 'crane']);
  const crane = join(dir, 'crane');
  const digest = run(crane, [
    'digest',
    '--platform=linux/amd64',
    `registry-1.docker.io/${tag}`,
  ]).trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest))
    throw new Error('Invalid image digest');
  const source = `registry-1.docker.io/supabase/postgres@${digest}`;
  const config = JSON.parse(run(crane, ['config', source])).config;
  // export flattens official layers (including whiteouts) into a single verified rootfs.
  run(crane, ['export', source, join(dir, 'rootfs.tar')], { stdio: 'inherit' });
  const args = ['import', '--platform', 'linux/amd64'];
  const change = (value) => args.push('--change', value);
  for (const value of config.Env ?? []) {
    const at = value.indexOf('=');
    change(`ENV ${value.slice(0, at)}=${JSON.stringify(value.slice(at + 1))}`);
  }
  if (config.Entrypoint)
    change(`ENTRYPOINT ${JSON.stringify(config.Entrypoint)}`);
  if (config.Cmd) change(`CMD ${JSON.stringify(config.Cmd)}`);
  if (config.User) change(`USER ${config.User}`);
  if (config.WorkingDir) change(`WORKDIR ${config.WorkingDir}`);
  for (const port of Object.keys(config.ExposedPorts ?? {}))
    change(`EXPOSE ${port}`);
  change(`LABEL org.agency-prospect.upstream-digest=${JSON.stringify(digest)}`);
  args.push(join(dir, 'rootfs.tar'), tag);
  run('docker', args);
  console.log(
    'Official PostgreSQL filesystem imported as one layer with preserved runtime configuration.',
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
