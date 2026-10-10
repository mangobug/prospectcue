import { describe, expect, it } from 'vitest';
import { auditDatabaseError } from '@/lib/audits/database-error';

describe('safe audit worker database diagnostics', () => {
  it('distinguishes missing migrations, permissions and database dependencies', () => {
    expect(auditDatabaseError('claim', { code: 'PGRST202' }).message).toContain(
      'API schema cache',
    );
    expect(auditDatabaseError('claim', { code: '42501' }).message).toContain(
      'permission denied',
    );
    expect(auditDatabaseError('claim', { code: '42883' }).message).toContain(
      'pgcrypto',
    );
  });

  it('distinguishes expired authorization from a concurrent worker lease', () => {
    expect(
      auditDatabaseError('claim', {
        code: 'P0001',
        message: 'Audit access denied',
      }).message,
    ).toContain('start a fresh audit');
    expect(
      auditDatabaseError('claim', {
        code: 'P0001',
        message: 'Audit already running',
      }).message,
    ).toContain('lease');
  });

  it('never includes provider messages, secret values or an underlying cause', () => {
    const secret = 'fictional-private-worker-capability';
    const failures = [
      { code: '42501', message: `denied for ${secret}` },
      { code: 'P0001', message: `Audit access denied ${secret}` },
      { code: secret, message: `fetch https://example.com/?token=${secret}` },
    ];
    for (const failure of failures) {
      const error = auditDatabaseError('claim', failure);
      expect(error.message).not.toContain(secret);
      expect(error.stack).not.toContain(secret);
      expect(error.cause).toBeUndefined();
    }
  });
});
