import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import { VerifyAccountInput } from './verify-account.contracts';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { AuthMethod } from 'src/identity/domain/auth-method.enum';
import { Account } from 'src/identity/domain/account.entity';
import { OTP } from 'src/shared/otp';
import { AccountAlreadyActive } from 'src/identity/domain/errors/account-already-active.error';
import { InvalidOTP } from 'src/identity/domain/errors/invalid-otp.error';

@Injectable()
export class VerifyAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
  ) {}

  async execute(input: VerifyAccountInput) {
    const account = await this.repository.findByUsername(input.username);

    if (!account) {
      throw new AccountNotFound();
    }
    if (this.isAlreadyActive(account)) {
      throw new AccountAlreadyActive();
    }
    console.log(account);
    console.log('====================');
    console.log(input);
    if (!this.isValidOTP(account, input.otp_code)) {
      throw new InvalidOTP();
    }
    account.activate();
    await this.repository.save(account);
  }

  private isValidOTP(account: Account, otp_code: string | null): boolean {
    const otp = new OTP();

    return (
      account.otp_code === otp_code &&
      !otp.hasExpired(account.otp_expiry as Date)
    );
  }

  private isAlreadyActive(account: Account): boolean {
    const isOAuthAccount = account.auth_method !== AuthMethod.LOCAL;
    const isAlreadyActive = !account.otp_code && !account.otp_expiry;

    return isAlreadyActive || isOAuthAccount;
  }
}
