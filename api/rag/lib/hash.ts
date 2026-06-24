import crypto from 'node:crypto';

export function createContentHash(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
