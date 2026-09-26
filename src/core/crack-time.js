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
// Crack time with stated assumptions: Argon2id 64 MiB, t = 3 runs at about
// 3,028 guesses per second on one RTX 5090 (bandwidth model, calibrated on a
// hashcat measurement on an RTX 4090).
export const ASSUMPTIONS = Object.freeze({ guessesPerGpu: 3028, gpus: 1e6, secondsPerYear: 31557600, universeYears: 1.38e10 });

export function crackYears(bits, a = ASSUMPTIONS) {
  // Average case: half of the search space.
  return 2 ** (bits - 1) / (a.guessesPerGpu * a.gpus) / a.secondsPerYear;
}

export function scientific(years) {
  const e = Math.floor(Math.log10(years));
  const m = Math.round(years / 10 ** e);
  return { mantissa: m, exponent: e };
}
