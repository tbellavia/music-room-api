import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  VERIFICATION_CODE_SENDER,
  VerificationCodeSender,
} from '../../ports/verification-code-sender';
import { ResendVerificationCodeInput } from './resend-verification-code.contracts';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { generateOtp } from 'src/shared/otp';

@Injectable()
export class ResendVerificationCodeUseCase {
  private readonly logger = new Logger(ResendVerificationCodeUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    @Inject(VERIFICATION_CODE_SENDER)
    private readonly verificationCodeSender: VerificationCodeSender,
  ) {}

  async execute(input: ResendVerificationCodeInput): Promise<void> {
    const account = await this.repository.findByUsername(input.username);

    if (!account) {
      throw new AccountNotFound();
    }

    const now = new Date();
    const otp = generateOtp(now);
    account.renewOtp(otp.code, otp.expiry, now);

    await this.repository.save(account);
    this.logger.log(`Verification code renewed account=${account.id}`);

    await this.verificationCodeSender.send({
      accountId: account.id,
      email: account.email,
      code: otp.code,
    });
  }
}
