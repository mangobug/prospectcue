import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { packetSchema } from './schema';
function key() {
  const secret = process.env.AUDIT_JOB_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('Audit encryption is not configured');
  return createHash('sha256').update(secret).digest();
}
export function sealPacket(packet: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(packetSchema.parse(packet))),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function openPacket(sealed: string) {
  if (sealed.length > 16000) throw new Error('Invalid audit packet');
  const bytes = Buffer.from(sealed, 'base64url');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return packetSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString(),
    ),
  );
}
