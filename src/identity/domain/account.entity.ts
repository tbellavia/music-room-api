import { isSameOtpCode } from 'src/shared/otp';
import { OTP_RESEND_COOLDOWN_SECONDS } from 'src/shared/constants';
import { AuthMethod } from './auth-method.enum';
import { AccountAlreadyActive } from './errors/account-already-active.error';
import { InvalidOTP } from './errors/invalid-otp.error';
import { OtpResendTooSoon } from './errors/otp-resend-too-soon.error';

export type CreateLocalAccountInfos = {
  id: string;
  username: string;
  email: string;
  password: string;
  otp_code: string;
  otp_expiry: Date;
  otp_sent_at: Date;
};

export type CreateGoogleAccountInfos = {
  id: string;
  username: string;
  email: string;
  password: string;
};

export class Account {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly password: string,
    public otp_code: string | null,
    public otp_expiry: Date | null,
    public otp_sent_at: Date | null,
    public otp_attempts: number,
    public is_active: boolean,
    public readonly auth_method: AuthMethod,
  ) {}

  // A local account stays inactive until its email is verified with the code
  static local(infos: CreateLocalAccountInfos): Account {
    return new Account(
      infos.id,
      infos.username,
      infos.email,
      infos.password,
      infos.otp_code,
      infos.otp_expiry,
      infos.otp_sent_at,
      0,
      false,
      AuthMethod.LOCAL,
    );
  }

  // The OAuth provider already verified the email: no code needed
  static google(infos: CreateGoogleAccountInfos): Account {
    return new Account(
      infos.id,
      infos.username,
      infos.email,
      infos.password,
      null,
      null,
      null,
      0,
      true,
      AuthMethod.GOOGLE,
    );
  }

  // Replaces the previous code, which becomes unusable. The cooldown prevents
  // flooding a mailbox, and resetting the attempts too often
  renewOtp(otpCode: string, otpExpiry: Date, now: Date): void {
    if (this.is_active) {
      throw new AccountAlreadyActive();
    }
    if (this.isResendTooSoon(now)) {
      throw new OtpResendTooSoon();
    }
    this.otp_code = otpCode;
    this.otp_expiry = otpExpiry;
    this.otp_sent_at = now;
    this.otp_attempts = 0;
  }

  activate(otpCode: string, now: Date): void {
    if (this.is_active) {
      throw new AccountAlreadyActive();
    }
    if (!this.isValidOtp(otpCode, now)) {
      throw new InvalidOTP();
    }
    this.is_active = true;
    this.otp_code = null;
    this.otp_expiry = null;
    this.otp_sent_at = null;
    this.otp_attempts = 0;
  }

  private isResendTooSoon(now: Date): boolean {
    if (this.otp_sent_at === null) {
      return false;
    }
    const cooldownInMilliseconds = OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const elapsedMilliseconds = now.getTime() - this.otp_sent_at.getTime();

    return elapsedMilliseconds < cooldownInMilliseconds;
  }

  private isValidOtp(otpCode: string, now: Date): boolean {
    if (this.otp_code === null || this.otp_expiry === null) {
      return false;
    }
    const hasExpired = now.getTime() > this.otp_expiry.getTime();
    if (hasExpired) {
      return false;
    }
    return isSameOtpCode(this.otp_code, otpCode);
  }
}
