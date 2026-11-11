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
import { PASSWORD_HASHER, PasswordHasher } from '../../ports/password-hasher';
import { ResetPasswordInput } from './reset-password.contracts';
import { InvalidOTP } from 'src/identity/domain/errors/invalid-otp.error';
import { TooManyOtpAttempts } from 'src/identity/domain/errors/too-many-otp-attempts.error';
import { OTP_MAX_ATTEMPTS } from 'src/shared/constants';
import { hashOtpCode } from 'src/shared/otp';

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resetRepository: PasswordResetRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_RESET_MAILER)
    private readonly mailer: PasswordResetMailer,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    // An unknown email gets the same error as a wrong code: nothing tells
    // whether the email has an account
    const account = await this.accountRepository.findByEmail(input.email);
    if (!account) {
      throw new InvalidOTP();
    }
    const pendingReset = await this.resetRepository.findByAccountId(account.id);
    if (!pendingReset) {
      throw new InvalidOTP();
    }

    // The attempt is consumed before comparing the code: parallel guesses
    // are bounded by the database, not by the counter loaded above
    const hasAttemptLeft = await this.resetRepository.consumeAttempt(
      account.id,
      OTP_MAX_ATTEMPTS,
    );
    if (!hasAttemptLeft) {
      throw new TooManyOtpAttempts();
    }

    const isCodeConsumed = await this.resetRepository.consumeCode(
      account.id,
      hashOtpCode(input.otp_code),
      new Date(),
    );
    if (!isCodeConsumed) {
      throw new InvalidOTP();
    }

    const hashedPassword = await this.passwordHasher.hash(input.new_password);
    account.resetPassword(hashedPassword);
    await this.accountRepository.save(account);
    this.logger.log(`Password reset account=${account.id}`);

    // Not awaited: the password is already changed, a mail failure must not
    // turn the response into an error
    const sending = this.mailer.sendPasswordChanged({
      accountId: account.id,
      email: account.email,
    });
    void sending.catch((error: unknown) => {
      this.logger.error(
        `Password changed email could not be sent account=${account.id}`,
        error,
      );
    });
  }
}
