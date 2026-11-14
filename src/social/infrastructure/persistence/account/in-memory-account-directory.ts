import { AccountDirectory } from 'src/social/application/ports/account-directory';

// Test double for use-case specs: no database involved
export class InMemoryAccountDirectory implements AccountDirectory {
  public readonly accountIds = new Set<string>();

  add(accountId: string): void {
    this.accountIds.add(accountId);
  }

  exists(accountId: string): Promise<boolean> {
    return Promise.resolve(this.accountIds.has(accountId));
  }
}
