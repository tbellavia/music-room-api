import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../ports/password-hasher';
import { Account } from 'src/identity/domain/account.entity';
import {
  DEV_ACCOUNT_PASSWORD,
  DEV_ACCOUNTS,
  DevAccountInfos,
} from 'src/identity/domain/dev-accounts';

// Run at each start in dev mode: creates the dev accounts that are missing
@Injectable()
export class EnsureDevAccountsUseCase {
  private readonly logger = new Logger(EnsureDevAccountsUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(): Promise<void> {
    for (const infos of DEV_ACCOUNTS) {
      await this.createIfMissing(infos);
    }
  }

  private async createIfMissing(infos: DevAccountInfos): Promise<void> {
    const existing = await this.accountRepository.findById(infos.id);
    if (existing) {
      return;
    }

    // A real account already took the name: it must stay untouched
    const isTaken = await this.isUsernameOrEmailTaken(infos);
    if (isTaken) {
      this.logger.warn(
        `Dev account not created: username=${infos.username} or its email is already taken`,
      );
      return;
    }

    const hashedPassword = await this.passwordHasher.hash(DEV_ACCOUNT_PASSWORD);
    const account = Account.dev({ ...infos, password: hashedPassword });
    await this.accountRepository.save(account);
    this.logger.log(`Dev account created username=${infos.username}`);
  }

  private async isUsernameOrEmailTaken(
    infos: DevAccountInfos,
  ): Promise<boolean> {
    const byUsername = await this.accountRepository.findByUsername(
      infos.username,
    );
    if (byUsername) {
      return true;
    }
    const byEmail = await this.accountRepository.findByEmail(infos.email);
    return byEmail !== null;
  }
}
