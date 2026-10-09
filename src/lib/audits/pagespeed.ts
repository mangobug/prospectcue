import type { AuditReport } from './schema';
export const unavailableSpeed: AuditReport['pageSpeed'] = {
  status: 'unavailable',
  performance: null,
  accessibility: null,
  seo: null,
  lcpMs: null,
  cls: null,
  measuredAt: null,
};
export async function pageSpeed(
  url: string,
): Promise<AuditReport['pageSpeed']> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) return { ...unavailableSpeed };
  const target = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
  );
  target.searchParams.set('url', url);
  target.searchParams.set('strategy', 'mobile');
  for (const category of ['performance', 'accessibility', 'seo'])
    target.searchParams.append('category', category);
  try {
    // API key stays out of URLs, provider payloads, and audit evidence.
    const response = await fetch(target, {
      headers: { 'X-Goog-Api-Key': key },
      signal: AbortSignal.timeout(45000),
      cache: 'no-store',
    });
    if (!response.ok) return { ...unavailableSpeed };
    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    if (!lighthouse || lighthouse.runtimeError) return { ...unavailableSpeed };
    const score = (name: string) => {
      const v = lighthouse.categories?.[name]?.score;
      return typeof v === 'number' && v >= 0 && v <= 1
        ? Math.round(v * 100)
        : null;
    };
    const metric = (name: string) => {
      const v = lighthouse.audits?.[name]?.numericValue;
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    };
    return {
      status: 'available',
      performance: score('performance'),
      accessibility: score('accessibility'),
      seo: score('seo'),
      lcpMs: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      measuredAt:
        typeof lighthouse.fetchTime === 'string'
          ? lighthouse.fetchTime.slice(0, 80)
          : null,
    };
  } catch {
    return { ...unavailableSpeed };
  }
}
