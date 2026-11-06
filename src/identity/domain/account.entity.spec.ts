import { Account, CreateLocalAccountInfos } from './account.entity';
import { AuthMethod } from './auth-method.enum';
import { AccountAlreadyActive } from './errors/account-already-active.error';
import { InvalidOTP } from './errors/invalid-otp.error';
import { OtpResendTooSoon } from './errors/otp-resend-too-soon.error';

const now = new Date('2026-01-01T12:00:00Z');
const beforeExpiry = new Date('2026-01-01T12:10:00Z');
const expiry = new Date('2026-01-01T12:15:00Z');
const afterExpiry = new Date('2026-01-01T12:16:00Z');
// The first code is sent at `now`: the cooldown lasts 60 seconds
const justBeforeCooldownEnd = new Date('2026-01-01T12:00:59Z');
const cooldownEnd = new Date('2026-01-01T12:01:00Z');

const validCode = '123456';
const wrongCode = '654321';

const localInfos: CreateLocalAccountInfos = {
  id: 'account-id',
  username: 'alice',
  email: 'alice@example.com',
  password: 'hashed-password',
  otp_code: validCode,
  otp_expiry: expiry,
  otp_sent_at: now,
};

describe('Account', () => {
  describe('creation', () => {
    it('creates a local account inactive, with its code', () => {
      const account = Account.local(localInfos);

      expect(account.is_active).toBe(false);
      expect(account.otp_code).toBe(validCode);
      expect(account.otp_expiry).toEqual(expiry);
      expect(account.otp_attempts).toBe(0);
      expect(account.auth_method).toBe(AuthMethod.LOCAL);
    });

    it('creates a google account already active, without code', () => {
      const account = Account.google({
        id: 'account-id',
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed-password',
      });

      expect(account.is_active).toBe(true);
      expect(account.otp_code).toBeNull();
      expect(account.auth_method).toBe(AuthMethod.GOOGLE);
    });

    it('keeps the username and the email of a google account in place', () => {
      const account = Account.google({
        id: 'account-id',
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed-password',
      });

      expect(account.username).toBe('alice');
      expect(account.email).toBe('alice@example.com');
    });
  });

  describe('activate', () => {
    it('activates the account and clears the code with the right code', () => {
      const account = Account.local(localInfos);

      account.activate(validCode, beforeExpiry);

      expect(account.is_active).toBe(true);
      expect(account.otp_code).toBeNull();
      expect(account.otp_expiry).toBeNull();
      expect(account.otp_sent_at).toBeNull();
      expect(account.otp_attempts).toBe(0);
    });

    it('rejects a wrong code', () => {
      const account = Account.local(localInfos);

      expect(() => account.activate(wrongCode, beforeExpiry)).toThrow(
        InvalidOTP,
      );
      expect(account.is_active).toBe(false);
    });

    it('rejects the right code once it has expired', () => {
      const account = Account.local(localInfos);

      expect(() => account.activate(validCode, afterExpiry)).toThrow(
        InvalidOTP,
      );
    });

    it('accepts the right code at the exact expiry time', () => {
      const account = Account.local(localInfos);

      account.activate(validCode, expiry);

      expect(account.is_active).toBe(true);
    });

    it('rejects a code of a different length', () => {
      const account = Account.local(localInfos);

      expect(() => account.activate('12345', beforeExpiry)).toThrow(InvalidOTP);
    });

    it('refuses to activate an account that is already active', () => {
      const account = Account.local(localInfos);
      account.activate(validCode, beforeExpiry);

      expect(() => account.activate(validCode, beforeExpiry)).toThrow(
        AccountAlreadyActive,
      );
    });
  });

  describe('renewOtp', () => {
    const newCode = '999999';
    const newExpiry = new Date('2026-01-01T13:00:00Z');

    it('replaces the code and resets the attempts once the cooldown is over', () => {
      const account = Account.local(localInfos);
      account.otp_attempts = 3;

      account.renewOtp(newCode, newExpiry, cooldownEnd);

      expect(account.otp_code).toBe(newCode);
      expect(account.otp_expiry).toEqual(newExpiry);
      expect(account.otp_sent_at).toEqual(cooldownEnd);
      expect(account.otp_attempts).toBe(0);
    });

    it('makes the previous code unusable', () => {
      const account = Account.local(localInfos);

      account.renewOtp(newCode, newExpiry, cooldownEnd);

      expect(() => account.activate(validCode, cooldownEnd)).toThrow(
        InvalidOTP,
      );
    });

    it('refuses a new code before the end of the cooldown', () => {
      const account = Account.local(localInfos);
      account.otp_attempts = 3;

      expect(() =>
        account.renewOtp(newCode, newExpiry, justBeforeCooldownEnd),
      ).toThrow(OtpResendTooSoon);
      expect(account.otp_code).toBe(validCode);
      expect(account.otp_attempts).toBe(3);
    });

    it('starts a new cooldown from the last code sent', () => {
      const account = Account.local(localInfos);
      account.renewOtp(newCode, newExpiry, cooldownEnd);
      const thirtySecondsLater = new Date('2026-01-01T12:01:30Z');

      expect(() =>
        account.renewOtp('111111', newExpiry, thirtySecondsLater),
      ).toThrow(OtpResendTooSoon);
    });

    it('refuses to renew the code of an active account', () => {
      const account = Account.local(localInfos);
      account.activate(validCode, beforeExpiry);

      expect(() => account.renewOtp(newCode, newExpiry, cooldownEnd)).toThrow(
        AccountAlreadyActive,
      );
    });
  });
});
