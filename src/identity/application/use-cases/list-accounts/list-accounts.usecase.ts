import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../ports/account.repository';
import {
  ListAccountsInput,
  ListAccountsOutput,
} from './list-accounts.contracts';

@Injectable()
export class ListAccountsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute(input: ListAccountsInput): Promise<ListAccountsOutput> {
    const users = await this.accountRepository.findActiveByUsernamePrefix({
      excludedAccountId: input.excludedAccountId,
      prefix: input.prefix,
    });

    return users.map((account) => {
      return {
        id: account.id,
        username: account.username,
      };
    });
  }
}
