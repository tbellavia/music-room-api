import { OTP_RESEND_COOLDOWN_SECONDS } from 'src/shared/constants';

export type CreatePasswordResetInfos = {
  accountId: string;
  codeHash: string;
  expiresAt: Date;
  sentAt: Date;
};

// A pending password reset: at most one per account, a new request replaces it.
// Kept apart from the verification code of the account, so that one code
// can never be used for the other purpose.
export class PasswordReset {
  constructor(
    public readonly accountId: string,
    public readonly codeHash: string,
    public readonly expiresAt: Date,
    public readonly sentAt: Date,
    public readonly attempts: number,
  ) {}

  static create(infos: CreatePasswordResetInfos): PasswordReset {
    return new PasswordReset(
      infos.accountId,
      infos.codeHash,
      infos.expiresAt,
      infos.sentAt,
      0,
    );
  }

  // Same cooldown as the verification code: prevents flooding a mailbox,
  // and resetting the attempts too often
  isRenewTooSoon(now: Date): boolean {
    const cooldownInMilliseconds = OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const elapsedMilliseconds = now.getTime() - this.sentAt.getTime();

    return elapsedMilliseconds < cooldownInMilliseconds;
  }
}
