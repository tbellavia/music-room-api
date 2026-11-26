import { Account } from 'src/identity/domain/account.entity';

export type FindActiveByUsernamePrefixInfos = {
  excludedAccountId: string;
  prefix: string | null;
};

export interface AccountRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  findByUsername(username: string): Promise<Account | null>;
  findByGoogleId(googleId: string): Promise<Account | null>;
  findActiveByUsernamePrefix(
    infos: FindActiveByUsernamePrefixInfos,
  ): Promise<Account[]>;
  save(account: Account): Promise<void>;
  // Everything the account owns is deleted with it (database cascades)
  delete(id: string): Promise<void>;
  // Same cascades. Returns the number of deleted accounts. The prefix must be
  // reserved (demo accounts): real accounts have random ids.
  deleteByIdPrefix(idPrefix: string): Promise<number>;
  // Atomically uses one code attempt if fewer than `maxAttempts` were used.
  // Returns false when none is left. Atomic so that parallel requests cannot
  // all read the same counter and exceed the limit.
  consumeOtpAttempt(accountId: string, maxAttempts: number): Promise<boolean>;
}

export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
