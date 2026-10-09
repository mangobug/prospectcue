import type { WebsiteFetch } from '../../src/lib/audits/safe-fetch';
// Controlled HTML exercises a real isolated Chromium. No external listing content.
export const fixtureFetch: WebsiteFetch = async (url) => ({
  url,
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: Buffer.from(
    '<!doctype html><html><head><title>Fictional audit fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><h1>Fictional test business</h1><div style="width:700px">Wide mobile content</div><img width="1" height="1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"><input id="unlabelled"><a href="/contact">Contact us</a></body></html>',
  ),
});
