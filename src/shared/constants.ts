export const USERNAME_MIN_LENGTH: number = 3;
export const USERNAME_MAX_LENGTH: number = 20;

export const FIRST_NAME_MIN_LENGTH: number = 2;
export const FIRST_NAME_MAX_LENGTH: number = 20;

export const LAST_NAME_MIN_LENGTH: number = 1;
export const LAST_NAME_MAX_LENGTH: number = 20;

export const PASSWORD_MAX_LENGTH: number = 72;
export const PASSWORD_MIN_LENGTH: number = 12;

export const PLAYLIST_NAME_MIN_LENGTH: number = 1;
export const PLAYLIST_NAME_MAX_LENGTH: number = 100;
export const PLAYLIST_DESCRIPTION_MAX_LENGTH: number = 500;
export const PLAYLIST_ZONE_RADIUS_METERS: number = 500;

// Waiting tracks of a playlist (unplayed for VOTE, all of them for EDITOR)
export const PLAYLIST_MAX_TRACKS: number = 200;

export const OTP_LENGTH: number = 6;
export const OTP_EXPIRY_MINUTES: number = 15;
// Wrong codes allowed per generated code: bounds brute force on 6 digits
export const OTP_MAX_ATTEMPTS: number = 5;
// Minimum delay between two codes sent to the same account
export const OTP_RESEND_COOLDOWN_SECONDS: number = 60;
