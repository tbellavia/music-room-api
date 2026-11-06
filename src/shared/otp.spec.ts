import { generateOtp, isSameOtpCode } from './otp';

describe('otp', () => {
  describe('generateOtp', () => {
    it('generates a code of 6 digits', () => {
      const otp = generateOtp(new Date());

      expect(otp.code).toMatch(/^\d{6}$/);
    });

    it('sets the expiry 15 minutes after now', () => {
      const now = new Date('2026-01-01T12:00:00Z');
      const fifteenMinutesLater = new Date('2026-01-01T12:15:00Z');

      const otp = generateOtp(now);

      expect(otp.expiry).toEqual(fifteenMinutesLater);
    });
  });

  describe('isSameOtpCode', () => {
    it('accepts the same code', () => {
      expect(isSameOtpCode('123456', '123456')).toBe(true);
    });

    it('rejects a different code', () => {
      expect(isSameOtpCode('123456', '123457')).toBe(false);
    });

    it('rejects a code of a different length', () => {
      expect(isSameOtpCode('123456', '1234567')).toBe(false);
    });
  });
});
