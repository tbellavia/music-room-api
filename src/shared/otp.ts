import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { OTP_EXPIRY_MINUTES, OTP_LENGTH } from 'src/shared/constants';

export type GeneratedOtp = {
  code: string;
  expiry: Date;
};

export function generateOtp(now: Date): GeneratedOtp {
  return {
    code: generateOtpCode(),
    expiry: computeOtpExpiry(now),
  };
}

// Constant-time comparison: the response time does not leak how many
// leading digits are right
export function isSameOtpCode(expectedCode: string, receivedCode: string) {
  const expectedBuffer = Buffer.from(expectedCode);
  const receivedBuffer = Buffer.from(receivedCode);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

// Stored instead of the code: a database leak does not give usable codes.
// A plain SHA-256 is enough for a short-lived code with limited attempts.
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// randomInt relies on a cryptographically secure generator, unlike Math.random
function generateOtpCode(): string {
  let code = '';

  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

function computeOtpExpiry(now: Date): Date {
  const expiryInMilliseconds = OTP_EXPIRY_MINUTES * 60 * 1000;

  return new Date(now.getTime() + expiryInMilliseconds);
}
