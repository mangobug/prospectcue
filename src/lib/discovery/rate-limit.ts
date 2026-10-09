import { createHash } from 'node:crypto';

// Burst protection per running server instance, not a plan or monthly allowance.
// Use the hosting firewall / provider quotas for distributed abuse protection.
const buckets = new Map<string, { start: number; hits: number }>();
export function allowDiscoveryBurst(identity: string, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const key = createHash('sha256')
    .update(`${minute}:${identity}`)
    .digest('hex');
  for (const [k, value] of buckets)
    if (now - value.start >= 60000) buckets.delete(k);
  const bucket = buckets.get(key) || { start: now, hits: 0 };
  if (bucket.hits >= 30 || (!buckets.has(key) && buckets.size >= 10000))
    return false;
  bucket.hits++;
  buckets.set(key, bucket);
  return true;
}
