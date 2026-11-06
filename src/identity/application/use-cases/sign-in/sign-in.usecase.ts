import { Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class SignInUseCase {
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

    if (!this.passwordService.compare(input.password, account.password)) {
      throw new Unauthorized();
    }
    if (!account.is_active) {
      throw new AccountNotActive();
    }

    const payload = { sub: account.id, username: account.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
