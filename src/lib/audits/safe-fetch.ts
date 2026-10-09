// Worker-only transport. Browser requests are fulfilled through this transport;
// they never get a second, uncontrolled DNS lookup or visitor credentials.
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib';
import { auditUrl, publicAddress } from './url';
export type WebsiteResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer;
};
export type WebsiteFetch = (url: string) => Promise<WebsiteResponse>;
export async function resolvePublic(host: string) {
  const addresses = await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('DNS timed out')), 3000);
      timer.unref();
    }),
  ]);
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error('Website resolved to a non-public address');
  return addresses[0];
}
const MAX_BODY = 4 * 1024 * 1024;
export function websiteFetcher(): WebsiteFetch {
  let requests = 0,
    bytes = 0;
  const deadline = Date.now() + 75000;
  return async function fetchPublic(value: string): Promise<WebsiteResponse> {
    let url = auditUrl(value, true);
    for (let redirects = 0; redirects <= 5; redirects++) {
      if (++requests > 60 || Date.now() > deadline)
        throw new Error('Website request budget exceeded');
      const pinned = await resolvePublic(url.hostname.replace(/^\[|\]$/g, ''));
      const response = await new Promise<WebsiteResponse>((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.get(
          url,
          {
            agent: false,
            family: pinned.family,
            headers: {
              'User-Agent': 'ProspectCueAudit/1.0 (public homepage review)',
              'Accept-Encoding': 'identity',
              Accept: '*/*',
            },
            // Preserve hostname and HTTPS certificate validation; pin only the socket address.
            lookup: (_hostname, _options, callback) =>
              callback(null, pinned.address, pinned.family),
          },
          (res) => {
            const chunks: Buffer[] = [];
            let size = 0;
            res.on('data', (chunk: Buffer) => {
              size += chunk.length;
              bytes += chunk.length;
              if (size > MAX_BODY || bytes > 20 * 1024 * 1024) {
                req.destroy(new Error('Website response too large'));
                return;
              }
              chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => {
              try {
                let body = Buffer.concat(chunks);
                const encoding = res.headers['content-encoding'];
                if (encoding === 'gzip')
                  body = gunzipSync(body, { maxOutputLength: MAX_BODY });
                else if (encoding === 'deflate')
                  body = inflateSync(body, { maxOutputLength: MAX_BODY });
                else if (encoding === 'br')
                  body = brotliDecompressSync(body, {
                    maxOutputLength: MAX_BODY,
                  });
                else if (encoding && encoding !== 'identity')
                  throw new Error('Unsupported website encoding');
                bytes += Math.max(0, body.length - size);
                if (bytes > 20 * 1024 * 1024)
                  throw new Error('Website response budget exceeded');
                const headers: Record<string, string> = {};
                for (const name of [
                  'content-type',
                  'location',
                  'content-security-policy',
                  'access-control-allow-origin',
                ]) {
                  const val = res.headers[name];
                  if (typeof val === 'string') headers[name] = val;
                }
                resolve({
                  url: url.href,
                  status: res.statusCode || 502,
                  headers,
                  body,
                });
              } catch {
                reject(new Error('Website response could not be decoded'));
              }
            });
          },
        );
        const timer = setTimeout(
          () => req.destroy(new Error('Website request timed out')),
          6000,
        );
        req.on('close', () => clearTimeout(timer));
        req.on('error', () =>
          reject(new Error('Website could not be reached securely')),
        );
      });
      if (
        [301, 302, 303, 307, 308].includes(response.status) &&
        response.headers.location
      ) {
        url = auditUrl(new URL(response.headers.location, url).href, true);
        continue;
      }
      return response;
    }
    throw new Error('Website redirected too many times');
  };
}
