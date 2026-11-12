import { ValidationOptions } from 'class-validator';

// Every code a DTO can send back in `error` when a field is invalid.
// Listed here so that the client has a closed set to handle, and a typo
// in a DTO does not compile. Documented in docs/ROUTES.md.
export type ValidationCode =
  // identity
  | 'USERNAME_INVALID'
  | 'USERNAME_TOO_SHORT'
  | 'USERNAME_TOO_LONG'
  | 'EMAIL_INVALID'
  | 'PASSWORD_INVALID'
  | 'PASSWORD_TOO_WEAK'
  | 'PASSWORD_TOO_LONG'
  | 'OTP_CODE_INVALID'
  | 'NEW_PASSWORD_INVALID'
  | 'NEW_PASSWORD_TOO_WEAK'
  | 'NEW_PASSWORD_TOO_LONG'
  | 'ID_TOKEN_INVALID'
  // playlists
  | 'PLAYLIST_TYPE_INVALID'
  | 'NAME_INVALID'
  | 'NAME_TOO_SHORT'
  | 'NAME_TOO_LONG'
  | 'DESCRIPTION_INVALID'
  | 'DESCRIPTION_TOO_LONG'
  | 'IS_PRIVATE_INVALID'
  | 'LICENSE_INVALID'
  | 'BEGIN_AT_INVALID'
  | 'END_AT_INVALID'
  | 'LATITUDE_INVALID'
  | 'LATITUDE_OUT_OF_RANGE'
  | 'LONGITUDE_INVALID'
  | 'LONGITUDE_OUT_OF_RANGE'
  | 'ACCOUNT_ID_INVALID'
  | 'HAS_PRIVILEGE_INVALID'
  // tracks
  | 'VIDEO_ID_INVALID'
  | 'AFTER_TRACK_ID_INVALID'
  | 'VERSION_INVALID';

// Attaches the code to a class-validator decorator: @MinLength(3, withCode('USERNAME_TOO_SHORT'))
export function withCode(code: ValidationCode): ValidationOptions {
  return { context: { code } };
}
