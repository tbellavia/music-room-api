import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import { DEV_ACCOUNTS } from 'src/identity/domain/dev-accounts';

// Run at each start outside dev mode: their password is public (123), they
// must not be usable in prod. Deleted by their fixed id, never by name.
@Injectable()
export class RemoveDevAccountsUseCase {
  private readonly logger = new Logger(RemoveDevAccountsUseCase.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(): Promise<void> {
    for (const infos of DEV_ACCOUNTS) {
      const existing = await this.accountRepository.findById(infos.id);
      if (existing) {
        await this.accountRepository.delete(infos.id);
        this.logger.log(`Dev account deleted username=${infos.username}`);
      }
    }
  }
}
