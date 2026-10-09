import ipaddr from 'ipaddr.js';
export function publicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}
export function auditUrl(value: string, allowQuery = false): URL {
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`,
    );
  } catch {
    throw new Error('Enter a valid public website URL.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port)) ||
    (!allowQuery && url.search) ||
    !host.includes('.') ||
    /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host) ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new Error(
      'Use a public HTTP or HTTPS website on port 80 or 443, without credentials or query parameters.',
    );
  url.hash = '';
  return url;
}
