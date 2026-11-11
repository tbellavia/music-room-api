import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  PASSWORD_RESET_REPOSITORY,
  PasswordResetRepository,
} from '../../ports/password-reset.repository';
import {
  PASSWORD_RESET_MAILER,
  PasswordResetMailer,
} from '../../ports/password-reset-mailer';
import { RequestPasswordResetInput } from './request-password-reset.contracts';
import { AuthMethod } from 'src/identity/domain/auth-method.enum';
import { PasswordReset } from 'src/identity/domain/password-reset.entity';
import { generateOtp, hashOtpCode } from 'src/shared/otp';

// Never fails and never tells whether the email has an account: the client
// gets the same answer for an unknown email, a Google account or a request
// sent too soon. Only the logs know which case it was.
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resetRepository: PasswordResetRepository,
    @Inject(PASSWORD_RESET_MAILER)
    private readonly mailer: PasswordResetMailer,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const account = await this.accountRepository.findByEmail(input.email);
    if (!account) {
      return;
    }
    // A Google account has no password of its own to reset
    if (account.auth_method !== AuthMethod.LOCAL) {
      this.logger.log(
        `Password reset ignored, not local account=${account.id}`,
      );
      return;
    }

    const now = new Date();
    const pendingReset = await this.resetRepository.findByAccountId(account.id);
    if (pendingReset && pendingReset.isRenewTooSoon(now)) {
      this.logger.log(`Password reset ignored, too soon account=${account.id}`);
      return;
    }

    const otp = generateOtp(now);
    const reset = PasswordReset.create({
      accountId: account.id,
      codeHash: hashOtpCode(otp.code),
      expiresAt: otp.expiry,
      sentAt: now,
    });
    await this.resetRepository.save(reset);
    this.logger.log(`Password reset requested account=${account.id}`);

    // Not awaited: sending takes time, which would tell an existing account
    // from an unknown email. A failure is only logged, for the same reason.
    const sending = this.mailer.sendResetCode({
      accountId: account.id,
      email: account.email,
      code: otp.code,
    });
    void sending.catch((error: unknown) => {
      this.logger.error(
        `Password reset email could not be sent account=${account.id}`,
        error,
      );
    });
  }
}
