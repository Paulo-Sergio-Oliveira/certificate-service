import { randomBytes } from 'node:crypto';

export function generateVerificationCode(): string {
  const year = new Date().getFullYear();
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `CERT-${year}-${randomPart}`;
}