// Read-only view of the accounts, owned by the social module so that it does
// not depend on the identity module
export interface AccountDirectory {
  exists(accountId: string): Promise<boolean>;
}

export const ACCOUNT_DIRECTORY = Symbol('SocialAccountDirectory');
