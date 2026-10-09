import { describe, it, expect, vi, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { auditUrl, publicAddress } from '@/lib/audits/url';
import { openPacket, sealPacket } from '@/lib/audits/packet';
import { findingsFor } from '@/lib/audits/findings';
import { pageSpeed } from '@/lib/audits/pagespeed';
import { reportSchema } from '@/lib/audits/schema';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('audit safety and evidence', () => {
  it.each([
    'http://127.0.0.1',
    'http://2130706433',
    'http://169.254.169.254',
    'http://10.2.3.4',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'file:///etc/passwd',
    'https://user:password@business.com',
    'https://business.com:8080',
    'https://business.com/?token=secret',
    'http://service.local',
  ])('rejects unsafe target %s', (target) => {
    expect(() => auditUrl(target)).toThrow();
  });
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '172.16.0.1',
    '100.64.0.1',
    '198.18.0.1',
    '::1',
    '::ffff:10.0.0.1',
    'fc00::1',
    'fe80::1',
    'ff00::1',
  ])('rejects non-public address %s', (ip) =>
    expect(publicAddress(ip)).toBe(false),
  );
  it('accepts ordinary public sites and addresses', () => {
    expect(auditUrl('example.com/#home').href).toBe('https://example.com/');
    expect(publicAddress('8.8.8.8')).toBe(true);
    expect(publicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('keeps worker capabilities encrypted and rejects tampering', () => {
    vi.stubEnv(
      'AUDIT_JOB_SECRET',
      'fictional-test-encryption-secret-more-than-32',
    );
    const packet = {
      runId: randomUUID(),
      token: 'a'.repeat(64),
      assetPath: 'test/mobile.png',
      uploadToken: 'fictional-upload-token',
    };
    const sealed = sealPacket(packet);
    expect(sealed).not.toContain(packet.token);
    expect(openPacket(sealed)).toEqual(packet);
    const bytes = Buffer.from(sealed, 'base64url');
    bytes[30] ^= 1;
    expect(() => openPacket(bytes.toString('base64url'))).toThrow();
  });
  it('records observations and downgrades incomplete-page findings', () => {
    const facts = {
      title: '',
      description: '',
      viewport: '',
      h1: 0,
      width: 390,
      documentWidth: 700,
      images: 2,
      imagesWithoutAlt: 1,
      contactLinks: 0,
      inputsWithoutLabels: 1,
    };
    expect(
      findingsFor(facts, 200, 'http://example.com', false).find(
        (f) => f.id === 'overflow',
      ),
    ).toMatchObject({
      status: 'issue',
      evidence: expect.stringContaining('700px'),
    });
    const incomplete = findingsFor(facts, 200, 'https://example.com', true);
    expect(incomplete.find((f) => f.id === 'title')?.status).toBe('unknown');
    expect(incomplete.find((f) => f.id === 'contact')?.status).toBe('unknown');
    expect(incomplete.find((f) => f.id === 'https')?.status).toBe('pass');
  });
  it('reports PageSpeed unavailable without a key and after provider failure', async () => {
    vi.stubEnv('GOOGLE_PAGESPEED_API_KEY', '');
    expect((await pageSpeed('https://example.com')).performance).toBeNull();
    vi.stubEnv('GOOGLE_PAGESPEED_API_KEY', 'fictional-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 429 })),
    );
    expect((await pageSpeed('https://example.com')).status).toBe('unavailable');
  });
  it('preserves measured PageSpeed scores without manufacturing missing metrics', async () => {
    vi.stubEnv('GOOGLE_PAGESPEED_API_KEY', 'fictional-key');
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          lighthouseResult: {
            fetchTime: '2026-10-09T12:00:00Z',
            categories: { performance: { score: 0.42 } },
            audits: { 'largest-contentful-paint': { numericValue: 4100 } },
          },
        }),
      );
    vi.stubGlobal('fetch', fetcher);
    expect(await pageSpeed('https://example.com')).toMatchObject({
      status: 'available',
      performance: 42,
      accessibility: null,
      seo: null,
      lcpMs: 4100,
      cls: null,
    });
    expect(fetcher.mock.calls[0][0].href).not.toContain('fictional-key');
  });
  it('does not allow executable links in persisted reports', () => {
    expect(
      reportSchema.shape.finalUrl.safeParse('javascript:alert(1)').success,
    ).toBe(false);
  });
});
