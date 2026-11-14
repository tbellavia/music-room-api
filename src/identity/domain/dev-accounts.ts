// Accounts that only exist in dev mode (ENVIRONMENT=dev), so that the iOS
// developers do not have to register: created at startup in dev mode, deleted
// at startup in any other mode. Two accounts, to test interactions
// (invitations, votes, friends).
export type DevAccountInfos = {
  // Fixed: deleting by id can never remove a real account with the same name
  id: string;
  username: string;
  email: string;
};

// Not a secret: the accounts are deleted outside dev mode
export const DEV_ACCOUNT_PASSWORD = '123';

export const DEV1_ACCOUNT: DevAccountInfos = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'dev1',
  email: 'dev1@example.com',
};

export const DEV2_ACCOUNT: DevAccountInfos = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'dev2',
  email: 'dev2@example.com',
};

export const DEV_ACCOUNTS: DevAccountInfos[] = [DEV1_ACCOUNT, DEV2_ACCOUNT];

export function isDevAccount(accountId: string): boolean {
  return DEV_ACCOUNTS.some((devAccount) => devAccount.id === accountId);
}
