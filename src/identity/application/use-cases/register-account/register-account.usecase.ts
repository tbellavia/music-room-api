import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RegisterAccountInput,
  RegisterAccountOutput,
} from './register-account.contracts';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  VERIFICATION_CODE_SENDER,
  VerificationCodeSender,
} from '../../ports/verification-code-sender';
import { PASSWORD_HASHER, PasswordHasher } from '../../ports/password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import { randomUUID } from 'crypto';
import { AccountAlreadyExistsError } from 'src/identity/domain/errors/account-already-exists.error';
import { generateOtp } from 'src/shared/otp';

@Injectable()
export class RegisterAccountUseCase {
  private readonly logger = new Logger(RegisterAccountUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(VERIFICATION_CODE_SENDER)
    private readonly verificationCodeSender: VerificationCodeSender,
  ) {}

  async execute(input: RegisterAccountInput): Promise<RegisterAccountOutput> {
    const accountWithSameEmail = await this.repository.findByEmail(input.email);
    if (accountWithSameEmail) {
      throw new AccountAlreadyExistsError();
    }
    const accountWithSameUsername = await this.repository.findByUsername(
      input.username,
    );
    if (accountWithSameUsername) {
      throw new AccountAlreadyExistsError();
    }

    const hashedPassword: string = await this.passwordHasher.hash(
      input.password,
    );

    const now = new Date();
    const otp = generateOtp(now);

    const account = Account.local({
      id: randomUUID(),
      username: input.username,
      email: input.email,
      password: hashedPassword,
      otp_code: otp.code,
      otp_expiry: otp.expiry,
      otp_sent_at: now,
    });

    // Saved before sending: if the email fails, the account exists and the
    // user can ask for a new code, instead of receiving a code for nothing
    await this.repository.save(account);
    this.logger.log(`Account registered account=${account.id}`);

    await this.verificationCodeSender.send({
      accountId: account.id,
      email: account.email,
      code: otp.code,
    });
    return { id: account.id };
  }
}
