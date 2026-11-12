import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  VerifyAccountInput,
  VerifyAccountOutput,
} from './verify-account.contracts';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { AccountAlreadyActive } from 'src/identity/domain/errors/account-already-active.error';
import { TooManyOtpAttempts } from 'src/identity/domain/errors/too-many-otp-attempts.error';
import { OTP_MAX_ATTEMPTS } from 'src/shared/constants';
import { JwtService } from '@nestjs/jwt';
import { signAccessToken } from '../../access-token';

@Injectable()
export class VerifyAccountUseCase {
  private readonly logger = new Logger(VerifyAccountUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    private readonly jwtService: JwtService,
  ) {}

  // The code proves access to the mailbox of the account: the user is signed
  // in right away, without calling login after
  async execute(input: VerifyAccountInput): Promise<VerifyAccountOutput> {
    const account = await this.repository.findByUsername(input.username);

    if (!account) {
      throw new AccountNotFound();
    }
    // Checked here too so that an active account does not consume attempts
    if (account.is_active) {
      throw new AccountAlreadyActive();
    }

    // The attempt is consumed before comparing the code: parallel guesses
    // are bounded by the database, not by the counter loaded above
    const hasAttemptLeft = await this.repository.consumeOtpAttempt(
      account.id,
      OTP_MAX_ATTEMPTS,
    );
    if (!hasAttemptLeft) {
      throw new TooManyOtpAttempts();
    }

    account.activate(input.otp_code, new Date());
    await this.repository.save(account);
    this.logger.log(`Account verified account=${account.id}`);

    return {
      access_token: signAccessToken(this.jwtService, account),
    };
  }
}
