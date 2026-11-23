import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from 'src/identity/application/ports/account.repository';
import { DEMO_ACCOUNTS } from 'src/demo/domain/demo-accounts';
import { RemoveDemoOutput } from './remove-demo.contracts';

// Deleting the demo accounts deletes the whole demo: their playlists, tracks,
// votes, friendships and invitations go with them (database cascades)
@Injectable()
export class RemoveDemoUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(): Promise<RemoveDemoOutput> {
    let removedAccounts = 0;
    for (const demoAccount of DEMO_ACCOUNTS) {
      const existing = await this.accountRepository.findById(demoAccount.id);
      if (existing) {
        await this.accountRepository.delete(demoAccount.id);
        removedAccounts = removedAccounts + 1;
      }
    }
    return { removedAccounts };
  }
}
