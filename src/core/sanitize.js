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
// File names from decrypted metadata come from the sender and are untrusted.
// Paths, control characters, and bidirectional overrides (which can make
// "invoice_fdp.exe" look like "invoice_exe.pdf") are removed.
const RISKY = new Set(['exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'msp', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
  'jar', 'app', 'pkg', 'dmg', 'command', 'sh', 'bash', 'zsh', 'lnk', 'hta', 'reg', 'dll', 'apk', 'appimage', 'deb', 'rpm',
  'workflow', 'scpt', 'applescript', 'terminal', 'pif', 'cpl', 'inf', 'url', 'iso', 'img',
  'chm', 'msix', 'msixbundle', 'appx', 'appxbundle', 'vhd', 'vhdx', 'xll', 'docm', 'xlsm', 'pptm', 'jnlp', 'desktop']);

export function sanitizeFileName(raw, fallback = 'decrypted-file') {
  let s = String(raw || '');
  const before = s;
  s = s.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^[\s.]+|[\s.]+$/g, '');
  if (s.length > 200) {
    const dot = s.lastIndexOf('.');
    const ext = dot > 0 && s.length - dot <= 16 ? s.slice(dot) : '';
    s = s.slice(0, 200 - ext.length) + ext;
  }
  if (!s) s = fallback;
  return { name: s, changed: s !== before };
}

export function riskOf(name) {
  const parts = name.toLowerCase().split('.');
  if (parts.length < 2) return { executable: false, doubleExtension: false };
  const ext = parts[parts.length - 1];
  const executable = RISKY.has(ext);
  const doubleExtension = executable && parts.length > 2 && parts[parts.length - 2].length <= 5;
  return { executable, doubleExtension };
}
