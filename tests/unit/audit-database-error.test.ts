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

  it('retains unknown SQLSTATE and HTTP identifiers without provider text', () => {
    const error = auditDatabaseError(
      'claim',
      { code: '42702', message: 'fictional-sensitive-query-value' },
      400,
    );
    expect(error.message).toContain('[HTTP 400; database code 42702]');
    expect(error.message).not.toContain('fictional-sensitive-query-value');
    expect(
      auditDatabaseError('claim', { code: 'PGRST999' }, 500).message,
    ).toContain('[HTTP 500; database code PGRST999]');
  });

  it('distinguishes gateway rejection, incorrect endpoint and no HTTP response', () => {
    expect(auditDatabaseError('claim', {}, 401).message).toContain(
      'rejected the worker API request',
    );
    expect(auditDatabaseError('claim', {}, 404).message).toContain(
      'endpoint not found',
    );
    expect(auditDatabaseError('claim', {}, 0).message).toContain(
      'did not receive a usable Supabase response',
    );
    expect(
      auditDatabaseError('claim', {
        message: 'TypeError: fictional-secret is an invalid header value',
      }).message,
    ).toContain('invalid HTTP header characters');
  });

  it('excludes invalid status values and codes containing sensitive text', () => {
    for (const httpStatus of [NaN, Infinity, -1, 200.5, 600]) {
      const error = auditDatabaseError(
        'claim',
        { code: '42702\nfictional-secret' },
        httpStatus,
      );
      expect(error.message).not.toContain('HTTP');
      expect(error.message).not.toContain('database code');
      expect(error.message).not.toContain('fictional-secret');
    }
  });
});
