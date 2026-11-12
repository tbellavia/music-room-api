import { Account } from 'src/identity/domain/account.entity';

export interface AccountRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  findByUsername(username: string): Promise<Account | null>;
  findByGoogleId(googleId: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
  // Atomically uses one code attempt if fewer than `maxAttempts` were used.
  // Returns false when none is left. Atomic so that parallel requests cannot
  // all read the same counter and exceed the limit.
  consumeOtpAttempt(accountId: string, maxAttempts: number): Promise<boolean>;
}

export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
