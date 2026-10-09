import { task } from '@trigger.dev/sdk';
import { context } from '@opentelemetry/api';
import { suppressTracing } from '@opentelemetry/core';
import { runWebsiteAudit } from '../src/lib/audits/worker';
export const websiteAudit = task({
  id: 'website-audit',
  maxDuration: 120,
  machine: 'small-2x',
  queue: { concurrencyLimit: 3 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 190000,
    maxTimeoutInMs: 200000,
    factor: 1,
    randomize: false,
  },
  run: async ({ sealed }: { sealed: string }) => {
    // Signed upload URLs and job capabilities must not be captured in HTTP spans.
    await context.with(suppressTracing(context.active()), () =>
      runWebsiteAudit(sealed),
    );
    return { processed: true };
  },
});
