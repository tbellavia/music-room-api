import {
  AccountDirectory,
  AccountSummary,
} from 'src/playlist/application/ports/account-directory';

// Test double for use-case specs: no database involved
export class InMemoryAccountDirectory implements AccountDirectory {
  public readonly accounts = new Map<string, AccountSummary>();

  add(account: AccountSummary): void {
    this.accounts.set(account.id, account);
  }

  findById(id: string): Promise<AccountSummary | null> {
    return Promise.resolve(this.accounts.get(id) ?? null);
  }

  findByIds(ids: string[]): Promise<AccountSummary[]> {
    const foundAccounts: AccountSummary[] = [];
    for (const id of ids) {
      const account = this.accounts.get(id);
      if (account) {
        foundAccounts.push(account);
      }
    }
    return Promise.resolve(foundAccounts);
  }
}
