import { Inject, Injectable, Logger } from '@nestjs/common';
import { SignInInput, SignInOutput } from './sign-in.contracts';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import { AccountNotFound } from 'src/identity/domain/errors/account-not-found.error';
import { PASSWORD_HASHER, PasswordHasher } from '../../ports/password-hasher';
import { Unauthorized } from 'src/identity/domain/errors/unauthorized.error';
import { JwtService } from '@nestjs/jwt';
import { AccountNotActive } from 'src/identity/domain/errors/account-not-active.error';
import { signAccessToken } from '../../access-token';

@Injectable()
export class SignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordService: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    const account = await this.repository.findByUsername(input.username);

    if (!account) {
      throw new AccountNotFound();
    }

    // A Google account has no password: same answer as a wrong password, so
    // the login route does not reveal how an account was created
    if (account.password === null) {
      throw new Unauthorized();
    }
    if (!this.passwordService.compare(input.password, account.password)) {
      throw new Unauthorized();
    }
    if (!account.is_active) {
      throw new AccountNotActive();
    }

    this.logger.log(`Account signed in account=${account.id}`);

    return {
      access_token: signAccessToken(this.jwtService, account),
    };
  }
}
