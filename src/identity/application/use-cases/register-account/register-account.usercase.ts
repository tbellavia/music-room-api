import { Inject, Injectable } from '@nestjs/common';
import {
  RegisterAccountInput,
  RegisterAccountOutput,
} from './register-account.contracts';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import { BcryptPasswordService } from 'src/identity/infrastructure/crypto/bcrypt-password.service';
import { Account } from 'src/identity/domain/account.entity';
import { randomUUID } from 'crypto';
import { AccountAlreadyExistsError } from 'src/identity/domain/errors/account-already-exists.error';

@Injectable()
export class RegisterAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly repository: AccountRepository,
    private readonly passwordHasher: BcryptPasswordService,
  ) {}

  async execute(input: RegisterAccountInput): Promise<RegisterAccountOutput> {
    const found = await this.repository.findByEmail(input.email);
    if (found) {
      throw new AccountAlreadyExistsError();
    }

    const hashedPassword: string = await this.passwordHasher.hash(
      input.password,
    );

    const account = Account.local({
      id: randomUUID(),
      username: input.username,
      email: input.email,
      password: hashedPassword,
    });

    await this.repository.save(account);
    return { id: account.id };
  }
}
