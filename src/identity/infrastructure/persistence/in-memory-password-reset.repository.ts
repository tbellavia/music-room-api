import { PasswordResetRepository } from 'src/identity/application/ports/password-reset.repository';
import { PasswordReset } from 'src/identity/domain/password-reset.entity';

// Test double for use-case specs: no database involved.
// Stores and returns copies, like a database.
export class InMemoryPasswordResetRepository implements PasswordResetRepository {
  public readonly resets = new Map<string, PasswordReset>();

  findByAccountId(accountId: string): Promise<PasswordReset | null> {
    const storedReset = this.resets.get(accountId);
    if (!storedReset) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.copy(storedReset, storedReset.attempts));
  }

  save(reset: PasswordReset): Promise<void> {
    this.resets.set(reset.accountId, this.copy(reset, reset.attempts));
    return Promise.resolve();
  }

  // Synchronous between the check and the update, like the single UPDATE
  consumeAttempt(accountId: string, maxAttempts: number): Promise<boolean> {
    const storedReset = this.resets.get(accountId);
    if (!storedReset || storedReset.attempts >= maxAttempts) {
      return Promise.resolve(false);
    }
    const attempts = storedReset.attempts + 1;
    this.resets.set(accountId, this.copy(storedReset, attempts));
    return Promise.resolve(true);
  }

  // Synchronous between the check and the delete, like the single DELETE
  consumeCode(
    accountId: string,
    codeHash: string,
    now: Date,
  ): Promise<boolean> {
    const storedReset = this.resets.get(accountId);
    if (!storedReset || storedReset.codeHash !== codeHash) {
      return Promise.resolve(false);
    }
    const hasExpired = now.getTime() > storedReset.expiresAt.getTime();
    if (hasExpired) {
      return Promise.resolve(false);
    }
    this.resets.delete(accountId);
    return Promise.resolve(true);
  }

  private copy(reset: PasswordReset, attempts: number): PasswordReset {
    return new PasswordReset(
      reset.accountId,
      reset.codeHash,
      reset.expiresAt,
      reset.sentAt,
      attempts,
    );
  }
}
