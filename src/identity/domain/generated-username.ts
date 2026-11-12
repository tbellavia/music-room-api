import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from 'src/shared/constants';

// Google gives no username: one is generated from the email, the user can
// change it later. A suffix of digits is added when it is already taken.
export const GENERATED_USERNAME_SUFFIX_LENGTH = 4;
const FALLBACK_USERNAME = 'user';
const BASE_MAX_LENGTH = USERNAME_MAX_LENGTH - GENERATED_USERNAME_SUFFIX_LENGTH;

// alice.Martin+music@gmail.com -> alicemartinmusic
export function usernameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  const letterAndDigits = localPart.toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = letterAndDigits.slice(0, BASE_MAX_LENGTH);

  if (base.length < USERNAME_MIN_LENGTH) {
    return FALLBACK_USERNAME;
  }
  return base;
}

// The suffix always has the same length, so the username stays within the limit
export function usernameWithSuffix(base: string, suffix: number): string {
  const paddedSuffix = String(suffix).padStart(
    GENERATED_USERNAME_SUFFIX_LENGTH,
    '0',
  );

  return `${base}${paddedSuffix}`;
}
