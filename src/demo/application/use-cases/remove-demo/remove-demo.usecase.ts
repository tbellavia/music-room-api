import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from 'src/identity/application/ports/account.repository';
import { DEMO_ACCOUNT_ID_PREFIX } from 'src/demo/domain/demo-accounts';
import { RemoveDemoOutput } from './remove-demo.contracts';

// Deleting the demo accounts deletes the whole demo: their playlists, tracks,
// votes, friendships and invitations go with them (database cascades). By id
// prefix: the accounts generated with a larger SEED_COUNT go too.
@Injectable()
export class RemoveDemoUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(): Promise<RemoveDemoOutput> {
    const removedAccounts = await this.accountRepository.deleteByIdPrefix(
      DEMO_ACCOUNT_ID_PREFIX,
    );
    return { removedAccounts };
  }
}
