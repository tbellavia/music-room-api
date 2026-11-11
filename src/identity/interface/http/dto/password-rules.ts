import { IsStrongPasswordOptions } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from 'src/shared/constants';

// Same strength rules at registration and when resetting a password
export const STRONG_PASSWORD_OPTIONS: IsStrongPasswordOptions = {
  minLength: PASSWORD_MIN_LENGTH,
  minSymbols: 1,
  minUppercase: 1,
  minLowercase: 1,
  minNumbers: 1,
};
