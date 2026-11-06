import { AccountRepository } from 'src/identity/application/ports/account.repository';
import { Account } from 'src/identity/domain/account.entity';
import { AccountAlreadyExistsError } from 'src/identity/domain/errors/account-already-exists.error';

// Test double for use-case specs: no database involved.
// Stores and returns copies, like a database: modifying a loaded account does
// not change the stored one until it is saved.
export class InMemoryAccountRepository implements AccountRepository {
  public readonly accounts = new Map<string, Account>();

  findByEmail(email: string): Promise<Account | null> {
    for (const account of this.accounts.values()) {
      if (account.email === email) {
        return Promise.resolve(this.copy(account));
      }
    }
    return Promise.resolve(null);
  }

  findById(id: string): Promise<Account | null> {
    const storedAccount = this.accounts.get(id);
    if (!storedAccount) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.copy(storedAccount));
  }

  findByUsername(username: string): Promise<Account | null> {
    for (const account of this.accounts.values()) {
      if (account.username === username) {
        return Promise.resolve(this.copy(account));
      }
    }
    return Promise.resolve(null);
  }

  // Same unique constraints as the database on email and username
  save(account: Account): Promise<void> {
    for (const storedAccount of this.accounts.values()) {
      const isOtherAccount = storedAccount.id !== account.id;
      const isSameEmail = storedAccount.email === account.email;
      const isSameUsername = storedAccount.username === account.username;
      if (isOtherAccount && (isSameEmail || isSameUsername)) {
        return Promise.reject(new AccountAlreadyExistsError());
      }
    }
    this.accounts.set(account.id, this.copy(account));
    return Promise.resolve();
  }

  consumeOtpAttempt(accountId: string, maxAttempts: number): Promise<boolean> {
    const storedAccount = this.accounts.get(accountId);
    if (!storedAccount || storedAccount.otp_attempts >= maxAttempts) {
      return Promise.resolve(false);
    }
    storedAccount.otp_attempts = storedAccount.otp_attempts + 1;
    return Promise.resolve(true);
  }

  private copy(account: Account): Account {
    return new Account(
      account.id,
      account.username,
      account.email,
      account.password,
      account.otp_code,
      account.otp_expiry,
      account.otp_sent_at,
      account.otp_attempts,
      account.is_active,
      account.auth_method,
    );
  }
}
