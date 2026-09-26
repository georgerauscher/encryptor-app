/*!
 * encryptor 3.0 · https://encryptor.app
 *
 * George A. Rauscher:
 * "Unencrypted data talks. I listened for 25 years.
 *  Make yours silent."
 *
 * Copyright (c) 2026 George A. Rauscher, intelligent piXel GmbH
 * Free to use, study, and share under the MIT License.
 * Keep the credit, keep the link: https://github.com/georgerauscher/encryptor-app
 */
import { isV3Header, TEXT_PREFIX } from './format-v3.js';

export function detectText(s) {
  const t = s.trim();
  if (t.startsWith(TEXT_PREFIX)) return 'v3';
  if (/^[A-Za-z0-9+/\s]+=*$/.test(t) && t.replace(/\s+/g, '').length >= 60) return 'v2';
  return 'unknown';
}

export function detectFile(first4, size) {
  if (isV3Header(first4)) return 'v3';
  if (size >= 64) return 'v2';
  return 'unknown';
}
