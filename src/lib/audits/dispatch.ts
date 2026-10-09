import 'server-only';
import { tasks } from '@trigger.dev/sdk';
import { spawn } from 'node:child_process';
export function localAuditWorker() {
  if (process.env.AUDIT_LOCAL_WORKER !== '1') return false;
  try {
    return (
      ['localhost', '127.0.0.1'].includes(
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname,
      ) &&
      ['localhost', '127.0.0.1'].includes(
        new URL(process.env.APP_URL || '').hostname,
      )
    );
  } catch {
    return false;
  }
}
export function auditsConfigured() {
  return (
    (process.env.AUDIT_JOB_SECRET?.length || 0) >= 32 &&
    (localAuditWorker() || !!process.env.TRIGGER_SECRET_KEY)
  );
}
export async function dispatchAudit(sealed: string, runId: string) {
  if (localAuditWorker()) {
    // Development only. Ciphertext travels over stdin, never command-line args or logs.
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/run-audit.ts'],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', 'ignore', 'ignore'],
        detached: true,
      },
    );
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(sealed);
    child.unref();
    return;
  }
  await tasks.trigger(
    'website-audit',
    { sealed },
    { idempotencyKey: runId, ttl: '20m' },
  );
}
