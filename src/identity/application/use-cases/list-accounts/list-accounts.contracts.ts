export type ListAccountsInput = {
  excludedAccountId: string;
  prefix: string | null;
};

// Only what other users may see: never the email or the password
export type ListedAccount = {
  id: string;
  username: string;
};

export type ListAccountsOutput = ListedAccount[];
