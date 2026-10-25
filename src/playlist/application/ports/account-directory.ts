// Read-only view of the accounts, owned by the playlist module so that it
// does not depend on the identity module

export type AccountSummary = {
  id: string;
  username: string;
};

export interface AccountDirectory {
  findById(id: string): Promise<AccountSummary | null>;
  findByIds(ids: string[]): Promise<AccountSummary[]>;
}

export const ACCOUNT_DIRECTORY = Symbol('AccountDirectory');
