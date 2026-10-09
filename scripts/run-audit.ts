// Local-only subprocess, launched by dispatch.ts with an encrypted packet on stdin.
import { runWebsiteAudit } from '../src/lib/audits/worker';
let sealed = '';
for await (const chunk of process.stdin) {
  sealed += chunk.toString();
  if (sealed.length > 16000) process.exit(1);
}
try {
  await runWebsiteAudit(sealed);
} catch {
  process.exitCode = 1;
}
