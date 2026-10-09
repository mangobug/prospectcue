import { createHmac, timingSafeEqual } from 'node:crypto';

export function googleReceipt(id: string, key: string, now = Date.now()) {
  const expires = now + 15 * 60 * 1000;
  const signature = createHmac('sha256', key)
    .update(`google-discovery:${id}:${expires}`)
    .digest('hex');
  return `${expires}.${signature}`;
}
export function verifyGoogleReceipt(
  id: string,
  token: string,
  key: string,
  now = Date.now(),
) {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires < now || expires > now + 15 * 60 * 1000) return false;
  const expected = createHmac('sha256', key)
    .update(`google-discovery:${id}:${expires}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}
