import { chromium } from 'playwright';
import { auditUrl } from './url';
import { websiteFetcher, type WebsiteFetch } from './safe-fetch';
import { findingsFor, type PageFacts } from './findings';
import { reportSchema } from './schema';
import { pageSpeed } from './pagespeed';

export async function inspectWebsite(
  target: string,
  transport: WebsiteFetch = websiteFetcher(),
) {
  const start = auditUrl(target).href;
  const first = await transport(start);
  const finalUrl = auditUrl(first.url, true).href;
  if (
    !first.headers['content-type']?.includes('text/html') ||
    first.status === 401 ||
    first.status === 403 ||
    first.status === 429
  )
    throw new Error(
      'The site blocked this visit or did not return an HTML page. Review it manually.',
    );
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: [
      '--disable-background-networking',
      '--host-resolver-rules=MAP * ~NOTFOUND',
    ],
  });
  const deadline = setTimeout(() => {
    void browser.close().catch(() => {});
  }, 90000);
  deadline.unref();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      acceptDownloads: false,
      ignoreHTTPSErrors: false,
    });
    let blocked = 0,
      served = false;
    await context.routeWebSocket('**/*', (socket) => socket.close());
    await context.route('**/*', async (route) => {
      if (route.request().method() !== 'GET') {
        blocked++;
        await route.abort();
        return;
      }
      try {
        const response =
          !served && route.request().url() === finalUrl
            ? ((served = true), first)
            : await transport(route.request().url());
        await route.fulfill({
          status: response.status,
          headers: response.headers,
          body: response.body,
        });
      } catch {
        blocked++;
        await route.abort();
      }
    });
    const page = await context.newPage();
    await page.goto(finalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {
      blocked++;
    });
    if (page.url() !== finalUrl)
      throw new Error(
        'The site changed page during the audit. Review it manually.',
      );
    const facts: PageFacts = await page.evaluate(() => {
      const controls = [
        ...document.querySelectorAll<HTMLInputElement>(
          'input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea',
        ),
      ].filter((el) => el.getClientRects().length > 0);
      return {
        title: document.title.slice(0, 500),
        description: (
          document.querySelector<HTMLMetaElement>('meta[name="description"]')
            ?.content || ''
        ).slice(0, 500),
        viewport: (
          document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
            ?.content || ''
        ).slice(0, 500),
        h1: document.querySelectorAll('h1').length,
        width: 390,
        documentWidth: document.documentElement.scrollWidth,
        images: document.images.length,
        imagesWithoutAlt: [...document.images].filter(
          (i) => !i.hasAttribute('alt'),
        ).length,
        contactLinks: [
          ...document.querySelectorAll<HTMLAnchorElement>('a[href]'),
        ].filter(
          (a) =>
            /^(tel:|mailto:)/i.test(a.getAttribute('href') || '') ||
            /contact|book|appointment|reservation/i.test(a.textContent || '') ||
            /contact|book|appointment/.test(a.pathname),
        ).length,
        inputsWithoutLabels: controls.filter(
          (el) =>
            !el.labels?.length &&
            !el.getAttribute('aria-label')?.trim() &&
            !el
              .getAttribute('aria-labelledby')
              ?.split(/\s+/)
              .some((id) => document.getElementById(id)?.textContent?.trim()),
        ).length,
      };
    });
    // Viewport only: bounded evidence, no forms clicked or submitted.
    const screenshot = await page.screenshot({
      type: 'png',
      timeout: 10000,
      animations: 'disabled',
    });
    const speed = await pageSpeed(finalUrl);
    const report = reportSchema.parse({
      version: 1,
      finalUrl,
      httpStatus: first.status,
      checkedAt: new Date().toISOString(),
      viewport: { width: 390, height: 844 },
      findings: findingsFor(facts, first.status, finalUrl, blocked > 0),
      pageSpeed: speed,
      limitations: [
        'Homepage only, one mobile viewport. No contact submissions, logins, purchases, or full-site accessibility test.',
        'Cookie banners, bot protection and blocked resources can affect results. A missing contact link is not proof that contact is impossible.',
        ...(blocked
          ? [
              `${blocked} resource request(s) were blocked, failed, or exceeded the loading budget. Review the screenshot before relying on findings.`,
            ]
          : []),
        ...(speed.status === 'unavailable'
          ? [
              'PageSpeed measurements were unavailable. No performance score was inferred.',
            ]
          : [
              'PageSpeed is a separate mobile lab measurement. Scores vary and do not represent every visitor.',
            ]),
      ],
    });
    return { report, screenshot };
  } finally {
    clearTimeout(deadline);
    await browser.close();
  }
}
